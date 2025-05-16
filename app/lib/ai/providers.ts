import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';

// Configure OpenAI providers with tool support
export const myProvider = customProvider({
  languageModels: {
    'gpt-3.5-turbo': openai('gpt-3.5-turbo'),
    'gpt-4': openai('gpt-4-turbo-preview', {
      tools: true,
    }),
    'gpt-4o': openai('gpt-4o', {
      tools: true,
    }),
    'gpt-o3-mini': openai('gpt-o3-mini'),
  }
}); 