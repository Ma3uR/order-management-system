import {
  appendClientMessage,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { ChatsRecord } from '@/app/types/pocketbase-types';
import {
  deleteChat,
  getChat,
  getMessagesByUserId,
  saveMessages,
} from '@/app/[locale]/chat/actions/chat';
import pocketbase, { authenticateAdmin } from '@/app/lib/pocketbase';
import { isAuthenticated as checkAuth } from '@/app/lib/pocketbase';
import { z } from 'zod';
import { systemPrompt } from '@/app/lib/ai/prompts';
import { myProvider } from '@/app/lib/ai/providers';
import { v4 as uuid } from 'uuid';
import { tools } from '@/app/lib/ai/tools';
import { createMessageWindow, trimOldMessages, logTokenUsage } from '@/app/lib/ai/message-window';
import { TOKEN_LIMITS } from '@/app/lib/ai/token-counter';

// Extended interface for assistant messages with tool invocations
interface AssistantMessageWithTools {
  id: string;
  role: 'assistant';
  content: string;
  toolInvocations?: Array<{
    toolName: string;
    toolCallId: string;
    state: string;
    result?: unknown;
  }>;
}

interface UserMessage {
  role: string;
  content: string;
}

interface ToolInvocation {
  toolName: string;
  toolCallId: string;
  state: string;
  result?: unknown;
}

// Define request body schema
const postRequestBodySchema = z.object({
  userId: z.string(),
  message: z.string().optional().default(''),
  selectedChatModel: z.string().optional().default('gpt-4o')
});

type PostRequestBody = z.infer<typeof postRequestBodySchema>;

export const maxDuration = 60;


export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);

    // Check if there are messages in the request (AI SDK format)
    if (json.messages && Array.isArray(json.messages) && json.messages.length > 0) {
      // Extract the last user message from the messages array
      const lastUserMessage = [...json.messages]
        .reverse()
        .find(msg => msg.role === 'user') as UserMessage | undefined;
        
      if (lastUserMessage && typeof lastUserMessage.content === 'string' && lastUserMessage.content.trim()) {
        // Override empty message with the one from messages array
        requestBody.message = lastUserMessage.content;
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 400 });
    }
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { userId, message } = requestBody;

    if (!pocketbase.authStore.isValid) {
      await authenticateAdmin();  // Use your existing admin auth function
    }

    const isUserAuthenticated = checkAuth();
    if (!isUserAuthenticated) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Debug: Log the available tools
    console.log('Available tools for AI:', Object.keys(tools));
    
    const previousMessages = await getMessagesByUserId(userId);

    // Find or create a chat for this user
    try {
      // First try to find an existing chat for this user
      const existingChats = await pocketbase.collection('chats').getFullList({
        filter: `user = "${userId}"`
      });
      
      // If no chat exists for this user, create one
      if (!existingChats || existingChats.length === 0) {
        const chatData: ChatsRecord = {     
          user: userId,
          messages: []
        };

        await pocketbase.collection('chats').create(chatData);
        console.log('Created new chat for user', userId);
      } else {
        console.log('Found existing chat for user', userId);
      }
    } catch (error) {
      console.error('Error finding/creating chat:', error);
    }

    // If message isn't provided directly in the request body,
    // we'll use the content from the most recent user message that comes in the messages array
    // This is needed because AI SDK might not send the message in the body but in the messages
    const messageContent = message || '';
    
    console.log('Final message content for processing:', messageContent);

    // Map message format to include content property for AI SDK compatibility
    const messageWithContent = {
      id: uuid(),
      content: messageContent,
      role: "user" as "user" | "system" | "assistant" | "data"
    };

    let messagesForAI = [];
    
    // Regular message handling
    messagesForAI = appendClientMessage({
      messages: previousMessages.data,
      message: messageWithContent,
    });

    // Apply token management before saving and sending
    console.log('📊 Token Management: Processing messages...');
    
    // First, trim very old messages if we have too many
    const trimmedMessages = trimOldMessages(messagesForAI, TOKEN_LIMITS.MAX_MESSAGES_TO_PROCESS);
    
    // Log initial token usage
    logTokenUsage(trimmedMessages, 'Before truncation');
    
    // Apply sliding window to ensure we're within token limits
    const { messages: windowedMessages, removedCount, totalTokens } = createMessageWindow(trimmedMessages);
    
    if (removedCount > 0) {
      console.log(`🔄 Token Management: Removed ${removedCount} old messages to fit within limits`);
      console.log(`📊 Token Management: Final token count: ${totalTokens}/${TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES}`);
    }
    
    // Save the windowed messages (this keeps storage clean)
    await saveMessages(userId, windowedMessages);

    // Check for and fix messages with array content (which causes validation errors)
    const fixedMessages = windowedMessages.map(msg => {
      if (typeof msg.content === 'object' && msg.content !== null) {
        console.log('Found message with object content, converting to string:', 
          { role: msg.role, contentType: typeof msg.content, isArray: Array.isArray(msg.content) });
        
        // Create shallow copy with content fixed
        return {
          ...msg,
          content: JSON.stringify(msg.content)
        };
      }
      return msg;
    });
    
    // Final token usage log
    logTokenUsage(fixedMessages, 'Final messages sent to OpenAI');

    return createDataStreamResponse({
      execute: (dataStream) => {        
        const result = streamText({
          model: myProvider.languageModel('gpt-3.5-turbo'),
          system: systemPrompt(),
          messages: fixedMessages, 
          maxSteps: 5, // Allow up to 5 tool calls in a single conversation turn
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: () => uuid(),
          tools,
          onFinish: async ({ response }) => {
            if (pocketbase.authStore.model?.id) {
              try {
                // Get the ID of the last assistant message
                const assistantMessages = response.messages.filter(
                  (message) => message.role === 'assistant'
                );
                
                if (assistantMessages.length === 0) {
                  console.warn('No assistant message found in response');
                  return;
                }
                
                const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
                
                // Log if there are tool invocations
                const tools = (lastAssistantMessage as AssistantMessageWithTools).toolInvocations || [];
                if (tools.length > 0) {
                  console.log('Tool invocations detected in response:', {
                    count: tools.length,
                    tools: tools.map((t: ToolInvocation) => t.toolName),
                    states: tools.map((t: ToolInvocation) => t.state)
                  });
                }
                
                // Create message with proper typing
                const assistantMessage: AssistantMessageWithTools = {
                  id: uuid(),
                  role: 'assistant',
                  content: typeof lastAssistantMessage.content === 'string' 
                    ? lastAssistantMessage.content 
                    : JSON.stringify(lastAssistantMessage.content),
                };
                
                // Add tool invocations if present
                if (tools.length > 0) {
                  assistantMessage.toolInvocations = tools;
                }

                // Get the current messages and append the new message instead of overwriting
                const currentMessages = await getMessagesByUserId(userId);
                const updatedMessages = currentMessages.data ? 
                  [...currentMessages.data, assistantMessage] : 
                  [messageWithContent, assistantMessage];
                
                // Apply token management to stored messages as well
                const { messages: finalStoredMessages } = createMessageWindow(updatedMessages);
                
                await saveMessages(userId, finalStoredMessages);
              } catch (error: unknown) {
                if (error instanceof Error) {
                  console.error('Failed to save chat', error.message);
                } else {
                  console.error('Failed to save chat', error);
                }
              }
            }
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: false
        });
      },
      onError: (error: Error | unknown) => {
        console.error("AI stream error:", error);
        
        if (error instanceof Error) {
          console.error("Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
          });
          return `Error: ${error.message}`;
        } else {
          console.error("Unknown error format:", typeof error);
          return 'An unexpected error occurred';
        }
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const isUserAuthenticated = checkAuth();
  if (!isUserAuthenticated) {
    return new Response('Unauthorized00000', { status: 401 });
  }

  try {
    const chat = await getChat(id);

    if (chat?.data?.user !== pocketbase.authStore.model?.id) {
      return new Response('Forbidden', { status: 403 });
    }

    const deletedChat = await deleteChat(id);

    return Response.json(deletedChat, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 500 });
    }
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}