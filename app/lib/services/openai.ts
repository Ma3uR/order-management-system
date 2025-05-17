import OpenAI from 'openai';
import { Message } from 'ai';
import type { ChatCompletionTool } from 'openai/resources';

// Get OpenAI API key from env var
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export { openai };

/**
 * Creates an OpenAI chat completion with the provided messages
 */
export async function createChatCompletion(messages: Array<Message>, tools: ChatCompletionTool[]) {
  return await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: "You are a helpful AI assistant exclusively for an order management system. You can ONLY answer questions about orders, help analyze order data, and provide assistance with the system's order management features. You can count orders, get the most recent order, and find orders by customer phone number. You MUST REFUSE to answer ANY questions not directly related to orders or the order management system. If asked about technologies, programming concepts, or any topics outside of order management, respond with: 'I can only assist with questions related to orders and the order management system.' DO NOT provide information about external technologies, libraries, frameworks, or concepts unless they are specifically implemented within this order management system."
      },
      ...messages.map((m: Message) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,
    tools: tools
  });
}

/**
 * Continues an OpenAI conversation with function call results
 */
export async function continueChatWithFunctionResult(
  messages: Array<Message>, 
  functionCallId: string, 
  functionName: string, 
  functionArgs: string, 
  functionResult: Record<string, unknown>
) {
  const openaiMessages = messages.map((m: Message) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content
  }));

  return await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: "You are a helpful AI assistant exclusively for an order management system. You can ONLY answer questions about orders, help analyze order data, and provide assistance with the system's order management features. You can count orders, get the most recent order, and find orders by customer phone number. You MUST REFUSE to answer ANY questions not directly related to orders or the order management system. If asked about technologies, programming concepts, or any topics outside of order management, respond with: 'I can only assist with questions related to orders and the order management system.' DO NOT provide information about external technologies, libraries, frameworks, or concepts unless they are specifically implemented within this order management system."
      },
      ...openaiMessages,
      {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: functionCallId,
          type: 'function',
          function: {
            name: functionName,
            arguments: functionArgs
          }
        }]
      },
      {
        role: 'tool',
        tool_call_id: functionCallId,
        content: JSON.stringify(functionResult)
      }
    ],
    temperature: 0.7,
    max_tokens: 1024
  });
} 