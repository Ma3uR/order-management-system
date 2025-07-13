/**
 * Message window management for token-limited AI conversations
 * Implements sliding window approach to keep conversations within token limits
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { 
  countMessagesTokens, 
  countMessageTokens, 
  TOKEN_LIMITS, 
  isWithinTokenLimit 
} from './token-counter';

interface Message {
  id?: string;
  role: string;
  content: string | object;
  toolInvocations?: Array<{
    toolName: string;
    toolCallId: string;
    state: string;
    result?: unknown;
  }>;
}

export interface MessageWindowResult {
  messages: Message[];
  removedCount: number;
  totalTokens: number;
  withinLimit: boolean;
}

/**
 * Creates a sliding window of messages that fits within token limits
 * Prioritizes recent messages while preserving important context
 */
export function createMessageWindow(messages: Message[]): MessageWindowResult {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      messages: [],
      removedCount: 0,
      totalTokens: 0,
      withinLimit: true
    };
  }

  // If already within limits, return as-is
  if (isWithinTokenLimit(messages)) {
    const { tokenCount } = countMessagesTokens(messages);
    return {
      messages: [...messages],
      removedCount: 0,
      totalTokens: tokenCount,
      withinLimit: true
    };
  }

  // Start with minimum required messages (most recent)
  const result = preserveImportantMessages(messages);
  
  return result;
}

/**
 * Preserves important messages while staying within token limits
 * Priority order:
 * 1. System messages (if any)
 * 2. Last few user-assistant pairs
 * 3. Messages with tool invocations
 * 4. Most recent messages
 */
function preserveImportantMessages(messages: Message[]): MessageWindowResult {
  const importantMessages: Message[] = [];
  const remainingMessages: Message[] = [...messages];
  let totalTokens = 0;

  // Step 1: Always keep system messages (they're usually small)
  const systemMessages = remainingMessages.filter(msg => msg.role === 'system');
  systemMessages.forEach(msg => {
    importantMessages.push(msg);
    totalTokens += countMessageTokens(msg);
  });
  
  // Remove system messages from remaining
  const nonSystemMessages = remainingMessages.filter(msg => msg.role !== 'system');

  // Step 2: Keep the most recent messages first (reverse order processing)
  const recentMessages = [...nonSystemMessages].reverse();
  
  for (const message of recentMessages) {
    const messageTokens = countMessageTokens(message);
    
    // Check if adding this message would exceed the limit
    if (totalTokens + messageTokens > TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES) {
      // If we don't have minimum messages yet, remove older messages to make room
      if (importantMessages.filter(m => m.role !== 'system').length < TOKEN_LIMITS.MIN_MESSAGES_TO_KEEP) {
        // Remove the oldest non-system message
        const oldestIndex = importantMessages.findIndex(m => m.role !== 'system');
        if (oldestIndex !== -1) {
          const removedMessage = importantMessages.splice(oldestIndex, 1)[0];
          totalTokens -= countMessageTokens(removedMessage);
        }
      } else {
        // We have enough messages, stop adding
        break;
      }
    }
    
    // Add the message (at the beginning to maintain order)
    importantMessages.splice(systemMessages.length, 0, message);
    totalTokens += messageTokens;
  }

  // Step 3: Ensure messages are in correct chronological order
  const systemMsgs = importantMessages.filter(m => m.role === 'system');
  const otherMsgs = importantMessages.filter(m => m.role !== 'system');
  
  // Sort other messages by their original order
  otherMsgs.sort((a, b) => {
    const aIndex = messages.findIndex(m => m.id === a.id || 
      (m.content === a.content && m.role === a.role));
    const bIndex = messages.findIndex(m => m.id === b.id || 
      (m.content === b.content && m.role === b.role));
    return aIndex - bIndex;
  });

  const finalMessages = [...systemMsgs, ...otherMsgs];
  const removedCount = messages.length - finalMessages.length;

  return {
    messages: finalMessages,
    removedCount,
    totalTokens,
    withinLimit: totalTokens <= TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES
  };
}

/**
 * Optimizes message content to reduce token usage
 * Truncates very long messages while preserving meaning
 */
export function optimizeMessageContent(message: Message, maxTokens: number = 500): Message {
  if (!message || !message.content) {
    return message;
  }

  const currentTokens = countMessageTokens(message);
  
  if (currentTokens <= maxTokens) {
    return message;
  }

  // Truncate content while preserving structure
  let optimizedContent = message.content;
  
  if (typeof optimizedContent === 'string') {
    // Calculate target length (rough estimation)
    const targetLength = Math.floor(optimizedContent.length * (maxTokens / currentTokens));
    
    if (targetLength < optimizedContent.length) {
      // Truncate but try to preserve sentence boundaries
      const truncated = optimizedContent.substring(0, targetLength);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      );
      
      if (lastSentenceEnd > targetLength * 0.7) {
        optimizedContent = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        optimizedContent = truncated + '...';
      }
    }
  }

  return {
    ...message,
    content: optimizedContent
  };
}

/**
 * Removes very old messages from conversation history
 * Keeps only the most recent N messages per user
 */
export function trimOldMessages(messages: Message[], maxMessages: number = TOKEN_LIMITS.MAX_MESSAGES_TO_PROCESS): Message[] {
  if (!Array.isArray(messages) || messages.length <= maxMessages) {
    return messages;
  }

  // Always keep system messages
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const otherMessages = messages.filter(msg => msg.role !== 'system');
  
  // Keep only the most recent messages
  const recentMessages = otherMessages.slice(-maxMessages);
  
  return [...systemMessages, ...recentMessages];
}

/**
 * Logs token usage information for debugging
 */
export function logTokenUsage(messages: Message[], context: string = 'Unknown'): void {
  const { tokenCount, characterCount, wordCount } = countMessagesTokens(messages);
  
  console.log(`[Token Usage - ${context}]`, {
    messageCount: messages.length,
    totalTokens: tokenCount,
    characters: characterCount,
    words: wordCount,
    withinLimit: tokenCount <= TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES,
    limitExceededBy: Math.max(0, tokenCount - TOKEN_LIMITS.AVAILABLE_FOR_MESSAGES)
  });
}