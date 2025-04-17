import OpenAI from 'openai';

export async function GET() {
  try {
    console.log('Testing OpenAI connection...');
    
    // Log API key format (safely)
    const apiKey = process.env.OPENAI_API_KEY || '';
    const keyPrefix = apiKey.substring(0, 7);
    const keySuffix = apiKey.slice(-4);
    console.log(`API key format: ${keyPrefix}...${keySuffix} (length: ${apiKey.length})`);
    
    // Create OpenAI client directly
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Try a simple completion
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello' }],
      model: 'gpt-3.5-turbo',
    });
    
    console.log('OpenAI test completed successfully');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'OpenAI connection works!',
      response: completion.choices[0]?.message?.content || 'No response',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('OpenAI test error:', error);
    
    // Get detailed error info
    let errorDetails: string | {
      name: string;
      message: string;
      stack?: string;
    } = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      console.error('Error details:', errorDetails);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'OpenAI connection failed',
      details: errorDetails,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 