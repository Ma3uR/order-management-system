/**
 * Token counting utility for managing OpenAI API token limits
 * Uses approximate token counting based on character length and word boundaries
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TokenCountResult {
  tokenCount: number;
  characterCount: number;
  wordCount: number;
}

/**
 * Estimates token count for a given text
 * OpenAI tokens are roughly 4 characters on average for English text
 * This is an approximation - actual tokenization may vary
 */
export function estimateTokenCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and normalize
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // Rough estimation: 1 token ≈ 4 characters for English
  // Adjust for special characters and punctuation
  const baseTokens = Math.ceil(cleanText.length / 4);
  
  // Add extra tokens for complex punctuation and special characters
  const specialCharBonus = (cleanText.match(/[{}[\]().,;:!?'"]/g) || []).length * 0.1;
  
  return Math.ceil(baseTokens + specialCharBonus);
}

/**
 * Counts tokens for a message object
 */
export function countMessageTokens(message: unknown): number {
  if (!message) return 0;
  
  let totalTokens = 0;
  
  // Count content tokens
  if (message.content) {
    if (typeof message.content === 'string') {
      totalTokens += estimateTokenCount(message.content);
    } else {
      // Handle object content (convert to string first)
      totalTokens += estimateTokenCount(JSON.stringify(message.content));
    }
  }
  
  // Count role tokens (small overhead)
  if (message.role) {
    totalTokens += 1;
  }
  
  // Count tool invocation tokens
  if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
    message.toolInvocations.forEach((tool: any) => {
      totalTokens += estimateTokenCount(tool.toolName || '');
      if (tool.result) {
        totalTokens += estimateTokenCount(JSON.stringify(tool.result));
      }
    });
  }
  
  return totalTokens;
}

/**
 * Counts total tokens for an array of messages
 */
export function countMessagesTokens(messages: unknown[]): TokenCountResult {
  if (!Array.isArray(messages)) {
    return { tokenCount: 0, characterCount: 0, wordCount: 0 };
  }
  
  let totalTokens = 0;
  let totalChars = 0;
  let totalWords = 0;
  
  messages.forEach(message => {
    const messageTokens = countMessageTokens(message);
    totalTokens += messageTokens;
    
    // Count characters and words for additional metrics
    if (message.content && typeof message.content === 'string') {
      totalChars += message.content.length;
      totalWords += message.content.split(/\s+/).filter(word => word.length > 0).length;
    }
  });
  
  // Add base overhead for the API call structure
  const apiOverhead = 10;
  totalTokens += apiOverhead;
  
  return {
    tokenCount: totalTokens,
    characterCount: totalChars,
    wordCount: totalWords
  };
}

/**
 * Configuration for token limits
 */
export const TOKEN_LIMITS = {
  // Leave room for response tokens and function calls
  MAX_INPUT_TOKENS: 8000,
  
  // Reserve tokens for system prompt and functions
  SYSTEM_PROMPT_TOKENS: 200,
  FUNCTION_TOKENS: 500,
  
  // Available tokens for conversation history
  get AVAILABLE_FOR_MESSAGES() {
    return this.MAX_INPUT_TOKENS - this.SYSTEM_PROMPT_TOKENS - this.FUNCTION_TOKENS;
  },
  
  // Minimum messages to keep (recent context)
  MIN_MESSAGES_TO_KEEP: 4,
  
  // Maximum messages to process at once
  MAX_MESSAGES_TO_PROCESS: 50
} as const;

/**
 * Checks if messages are within token limits
 */
export function isWithinTokenLimit(messages: unknown[]): boolean {
  const { tokenCount } = countMessagesTokens(messages);
  return tokenCount <= TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES;
}

/**
 * Estimates tokens for system prompt and functions
 */
export function estimateSystemTokens(systemPrompt: string, functionCount: number = 6): number {
  const systemTokens = estimateTokenCount(systemPrompt);
  const functionTokens = functionCount * 70; // Approximate tokens per function definition
  return systemTokens + functionTokens;
}