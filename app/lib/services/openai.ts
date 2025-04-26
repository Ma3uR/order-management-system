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
        content: "You are a helpful AI assistant for an order management system. You can answer questions about orders, help analyze data, and provide general assistance with the system's features. You can count orders, get the most recent order, and find orders by customer phone number."
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
        content: "You are a helpful AI assistant for an order management system. You can answer questions about orders, help analyze data, and provide general assistance with the system's features. You can count orders, get the most recent order, and find orders by customer phone number."
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