import {
  appendClientMessage,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import { getLastOrder } from '@/app/lib/services/orders';
import { ChatsRecord } from '@/pocketbase-types';
// import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChat,
  getChat,
  getMessagesByUserId,
  saveMessages,
} from '@/app/[locale]/chat/actions/chat';
// import { generateUUID, getTrailingMessageId } from '@/lib/utils';
// import { generateTitleFromUserMessage } from '../../actions';
// import { createDocument } from '@/lib/ai/tools/create-document';
// import { updateDocument } from '@/lib/ai/tools/update-document';
// import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
// import { getWeather } from '@/lib/ai/tools/get-weather';
// import { isProductionEnvironment } from '@/lib/constants';
import pocketbase, { authenticateAdmin, authenticatedCall } from '@/app/lib/pocketbase';
import { isAuthenticated as checkAuth } from '@/app/lib/pocketbase';
import { z } from 'zod';
import { systemPrompt } from '@/app/lib/ai/prompts';
import { myProvider } from '@/app/lib/ai/providers';
import { v4 as uuid } from 'uuid';

// Define request body schema
const postRequestBodySchema = z.object({
  userId: z.string(),
  message: z.string().optional().default(''),
  selectedChatModel: z.string().optional().default('gpt-3.5-turbo')
});

type PostRequestBody = z.infer<typeof postRequestBodySchema>;

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return new Response(error.message, { status: 400 });
    }
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { userId, message, selectedChatModel } = requestBody;

    if (!pocketbase.authStore.isValid) {
      await authenticateAdmin();  // Use your existing admin auth function
    }

    const isUserAuthenticated = checkAuth();
    if (!isUserAuthenticated) {
      return new Response('Unauthorized111111x', { status: 401 });
    }

    // const userType: UserType = session.user.type;
    //TODO: Uncomment this when we have a way to check the user type
    // const messageCount = await getMessageCountByUserId({
    //   id: session.user.id,
    //   differenceInHours: 24,
    // });

    // if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
    //   return new Response(
    //     'You have exceeded your maximum number of messages for the day! Please try again later.',
    //     {
    //       status: 429,
    //     },
    //   );
    // }

    const previousMessages = await getMessagesByUserId(userId);

    // Find or create a chat for this user
    try {
      // First try to find an existing chat for this user
      const existingChats = await authenticatedCall(() => 
        pocketbase.collection('chats').getFullList({
          filter: `user = "${userId}"`
        })
      );
      
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

    // Map message format to include content property for AI SDK compatibility
    const messageWithContent = {
      id: uuid(),
      content: messageContent,
      role: "user" as "user" | "system" | "assistant" | "data"
    };

    const messages = appendClientMessage({
      messages: previousMessages.data,
      message: messageWithContent,
    });

    await saveMessages(userId, messages);

    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel('gpt-3.5-turbo'),
          system: systemPrompt({ selectedChatModel }),
          messages,
          maxSteps: 5,
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: () => uuid(),
          tools: {
            getWeatherInformation: {
              description: 'show the weather in a given city to the user',
              parameters: z.object({ city: z.string() }),
              execute: async ({}: { city: string }) => {
                const weatherOptions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
                return weatherOptions[
                  Math.floor(Math.random() * weatherOptions.length)
                ];
              },
            },
            // getLastOrder: {
            //   description: 'Get the last order in the system',
            //   parameters: z.object({}),
            //   execute: async () => {
            //     return getLastOrder();
            //   },
            // },
          },
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
                
                // Extract just the content from the assistant message
                const assistantMessage = {
                  id: uuid(),
                  role: 'assistant',
                  content: assistantMessages[assistantMessages.length - 1].content.toString(),
                };

                // Get the current messages and append the new message instead of overwriting
                const currentMessages = await getMessagesByUserId(userId);
                const updatedMessages = currentMessages.data ? 
                  [...currentMessages.data, assistantMessage] : 
                  [messageWithContent, assistantMessage];
                
                await saveMessages(userId, updatedMessages);
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
      onError: () => {
        return 'Oops, an error occurred!';
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