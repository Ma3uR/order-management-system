import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  console.log('API route /api/chat hit at:', new Date().toISOString());
  
  try {
    console.log('Processing chat request...');
    const { messages } = await req.json();
    console.log('Received messages:', messages.length);
    
    // Log the OpenAI key format (safe way, just first/last few chars)
    const apiKey = process.env.OPENAI_API_KEY || '';
    const keyPrefix = apiKey.substring(0, 7);
    const keySuffix = apiKey.slice(-4);
    const keyLength = apiKey.length;
    console.log(`API key format: ${keyPrefix}...${keySuffix} (length: ${keyLength})`);
    
    // Use a more widely available model
    const result = streamText({
      model: openai('gpt-3.5-turbo'),
      system: 'You are a helpful assistant for our order management system. You can help with order queries, reports, and general questions about the system.',
      messages,
    });

    console.log('Streaming response back to client');
    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    // Log the detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 