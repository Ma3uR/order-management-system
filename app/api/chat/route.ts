import { createOrGetUserChat, saveChat } from '@/app/lib/chat-store';
import { NextResponse } from 'next/server';
import { Message } from 'ai';
import OpenAI from 'openai';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to verify user exists in database
async function verifyUserId(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.log('verifyUserId: userId is empty or null');
      return false;
    }    
    // First try direct lookup to see if user exists
    try {
      await authenticatedCall(() => pb.collection('users').getOne(userId));
      console.log(`verifyUserId: User found with direct lookup: "${userId}"`);
      return true;
    } catch (error) {
      // If direct lookup fails, try to search for the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`verifyUserId: Direct lookup failed for "${userId}", trying list: ${errorMessage}`);
      
      const users = await authenticatedCall(() => pb.collection('users').getList(1, 1, {
        filter: `id = "${userId}"`
      }));
      
      if (users.totalItems > 0) {
        console.log(`verifyUserId: User found with list query: "${userId}"`);
        return true;
      }
      
      console.log(`verifyUserId: No user found with ID "${userId}"`);
      return false;
    }
  } catch (error) {
    console.error(`Error verifying user "${userId}":`, error);
    return false;
  }
}

// This is the main chat route that handles chat requests
export async function POST(req: Request) {
  try {
    const { messages, id, userId, debug } = await req.json();
    
    // For debugging
    console.log(`Chat API called with id: ${id}, userId: "${userId}", type: ${typeof userId}`);
    
    // Log debug info if available
    if (debug) {
      console.log('Client debug info:', JSON.stringify(debug, null, 2));
    }
    
    console.log(`Processing ${messages.length} messages`);
    
    // Get or create a chat ID
    let chatId = id;
    
    // If we have a userId, verify it exists and get or create their chat
    if (userId) {
      console.log(`Attempting to validate user ID: "${userId}"`);
      // Verify the user exists before trying to create a chat for them
      const userExists = await verifyUserId(userId);
      
      if (!userExists) {
        console.error(`User ${userId} does not exist in the database`);
        const response = NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        );
        // Add header to indicate auth error
        response.headers.set('X-Error-Type', 'auth');
        return response;
      }
      
      chatId = await createOrGetUserChat(userId);
      console.log(`Using chat ID ${chatId} for user ${userId}`);
    } else if (!chatId) {
      // If no userId and no chatId, we can't proceed properly
      console.warn('No userId or chatId provided - chat persistence may be limited');
    }
    
    // Convert messages to OpenAI format
    const openaiMessages = [
      {
        role: "system", 
        content: "You are a helpful AI assistant for an order management system. You can answer questions about orders, help analyze data, and provide general assistance with the system's features."
      },
      ...messages.map((m: Message) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ];
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });
    
    // Create a stream for the response
    // We need to manually handle streaming since we're not using vercel ai sdk's stream functions
    const stream = new ReadableStream({
      async start(controller) {
        // Function to send a complete message
        function sendMessage(chunk: string) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        
        try {
          let text = '';
          
          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              text += content;
              sendMessage(content);
            }
          }
          
          // Save the full conversation with the AI's response
          if (chatId) {
            // Add the AI response to messages
            const updatedMessages = [...messages, {
              id: `ai-${Date.now()}`,
              role: 'assistant' as const,
              content: text,
              createdAt: new Date()
            }];
            
            // Save to database
            await saveChat({
              id: chatId,
              userId,
              messages: updatedMessages
            });
            console.log(`Saved updated chat with ${updatedMessages.length} messages`);
          }
          
          // End the stream
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Error processing stream:', error);
          controller.error(error);
        }
      }
    });
    
    // Build and return the response
    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    
    if (chatId) {
      headers.set('X-Chat-ID', chatId);
    }
    
    return new Response(stream, {
      headers
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 