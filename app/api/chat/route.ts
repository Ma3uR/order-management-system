import { createOrGetUserChat, saveChat } from '@/app/lib/chat-store';
import { NextResponse } from 'next/server';
import { Message, streamText } from 'ai';
import { openai as aiOpenAI } from '@ai-sdk/openai';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';

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
    console.log(`Chat API called with id: ${id}, userId: "${userId}"`);
    
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
    
    // Use streamText with the correct model format
    const result = streamText({
      model: aiOpenAI('gpt-3.5-turbo'),
      system: "You are a helpful AI assistant for an order management system. You can answer questions about orders, help analyze data, and provide general assistance with the system's features.",
      messages: messages.map((m: Message) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      })),
      temperature: 0.7,
      maxTokens: 1024,
      onFinish: async ({ response }) => {
        if (chatId) {
          // Extract the text content from the response
          const responseContent = response.messages[response.messages.length - 1]?.content || '';
          
          // Add the AI response to messages
          const updatedMessages = [...messages, {
            id: `ai-${Date.now()}`,
            role: 'assistant' as const,
            content: responseContent,
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
      }
    });
    
    // Return a text stream response for client compatibility
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 