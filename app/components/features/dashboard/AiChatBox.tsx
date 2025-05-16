'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { ScrollArea } from "@/app/components/shared/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/shared/ui/avatar";
import { Send, Bot, User, StopCircle, RefreshCw, Trash2, CloudRain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from '@ai-sdk/react';
import { Message, ToolInvocation } from 'ai';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { clearUserChat } from '@/app/lib/chat-store';
import { useSession } from './useSession';
import { Weather } from './wheater';

interface AiChatBoxProps {
  id?: string;
  userId?: string;
  initialMessages?: Message[];
}

// Detect if there's weather content in the message text
function detectWeatherInfo(content: string): React.ReactNode {
  // Pattern to match weather information in markdown format
  const markdownRegex = /[\*\-].*Temperature:[\*\s]*(\d+)°C[\*\s\n]*.*Condition:[\*\s]*(\w+)[\*\s\n]*.*(?:Humidity:[\*\s]*(\d+)%)?[\*\s\n]*.*(?:Wind Speed:[\*\s]*(\d+)\s*km\/h)?/m;
  
  // Standard pattern
  const stdRegex = /Temperature:\s*(\d+)°C[\s\S]*?Condition:\s*(\w+)[\s\S]*?(?:Humidity:\s*(\d+)%)?[\s\S]*?(?:Wind Speed:\s*(\d+)\s*km\/h)?/m;
  
  const match = content.match(markdownRegex) || content.match(stdRegex);
  
  if (match) {
    console.log('Detected weather info in text content', match);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [fullMatch, temperature, condition, humidity, windSpeed] = match;
    
    // Extract location from text
    const locationRegex = /(?:weather|display)?\s+(?:for|in)\s+([^:\n.]+)(?::|\.|\n)/i;
    const locationMatch = content.match(locationRegex);
    const location = locationMatch ? locationMatch[1] : "Unknown Location";
    
    console.log('Found weather location:', location);
    
    return (
      <>
        <div className="mb-3">{content}</div>
        <div className="mt-2 border-t pt-2 border-blue-200 dark:border-blue-800">
          <Weather
            location={location}
            temperature={parseInt(temperature, 10)}
            weather={condition}
          />
        </div>
      </>
    );
  }
  
  return content;
}

/**
 * Render message content safely, handling potential JSON strings
 */
function renderMessageContent(content: unknown): React.ReactNode {
  if (content === null || content === undefined) {
    return '';
  }

  // If content is already a string, check for common weather patterns
  if (typeof content === 'string') {
    // First, check for weather information in different formats
    if (
      (content.includes('Temperature:') && content.includes('Condition:')) ||
      (content.includes('weather') && content.includes('°C')) ||
      (content.includes('**Temperature:**') && content.includes('**Condition:**'))
    ) {
      return detectWeatherInfo(content);
    }
    
    // Specific fix for weather api responses that have a specific format
    if (content.includes('The weather in') && content.includes(' is ')) {
      return content; // Just return the formatted weather text directly
    }
    
    // Check if it's an escaped stringified array with type/text (common for weather tools)
    if (content.startsWith('[{') && content.includes('"type":"text"')) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.some(item => item.type === 'text')) {
          return parsed
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join(' ');
        }
      } catch {
        // If we can't parse directly, continue with other approaches
      }
    }
    
    // First handle common malformed JSON prefixes 
    if (content.startsWith('[{\\')) {
      // This is a common pattern in malformed messages
      // First try to fix obvious double escaping
      const fixedContent = content.replace(/^\[\{\\/, '[{').replace(/\\"/g, '"');
      console.log("Fixed string prefix:", fixedContent.substring(0, 50));
      
      try {
        // Try parsing the fixed content
        return renderMessageContent(JSON.parse(fixedContent));
      } catch (e) {
        // If we can't parse it even after fixing, just render the cleaned up version
        console.error("Failed to parse content after prefix fix:", e);
        return fixedContent;
      }
    }
    
    // Check if it's a JSON string (starting with [ or {)
    if ((content.startsWith('[') || content.startsWith('{')) && 
        (content.includes('"type"') || content.includes('"text"'))) {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(content);
        
        // If we have an array of objects with type/text fields, this is likely a rich text format
        if (Array.isArray(parsed) && parsed.some(item => item.type === 'text')) {
          // Extract just the text content from the rich text format
          return parsed
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join(' ');
        }
        
        // If single object with text property
        if (parsed.text) {
          return parsed.text;
        }
        
        // If nested array with type/text
        if (Array.isArray(parsed) && parsed.some(item => item.text && typeof item.text === 'string')) {
          return parsed
            .map(item => item.text || JSON.stringify(item))
            .join(' ');
        }
        
        // For any other object, format it nicely
        if (typeof parsed === 'object' && parsed !== null) {
          return (
            <pre className="text-sm whitespace-pre-wrap overflow-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        }
        
        // If it parsed as something else, just return it
        return String(parsed);
      } catch {
        // If it's not valid JSON, handle it as regular text
        return content;
      }
    }
    
    // Handle the specific case of malformed tool responses
    if (content.includes('[{"type":"text","text":"')) {
      try {
        // Extract the actual text using regex
        const textMatch = content.match(/\[\{"type":"text","text":"(.*?)"\}\]/);
        if (textMatch && textMatch[1]) {
          return textMatch[1];
        }
      } catch {
        // If extraction fails, return as is
      }
    }
    
    // Normal string, not JSON
    return content;
  }

  // If content is an array (e.g., AI SDK rich text format)
  if (Array.isArray(content)) {
    // If array of rich text objects
    if (content.some(item => item.type === 'text')) {
      return content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join(' ');
    }
    
    // Generic array
    return content.map((item, index) => (
      <div key={index}>{renderMessageContent(item)}</div>
    ));
  }

  // If content is already an object, stringify it
  if (typeof content === 'object') {
    try {
      // If it has a text property, use that
      if (content && 'text' in content && typeof (content as Record<string, unknown>).text === 'string') {
        return (content as Record<string, string>).text;
      }
      
      // Otherwise stringify the whole object
      return (
        <pre className="text-sm whitespace-pre-wrap overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    } catch {
      return '[Complex Object]';
    }
  }

  // For any other type, convert to string
  return String(content);
}

// Render tool invocations, specifically for weather data
function renderToolInvocations(toolInvocations: ToolInvocation[]) {
  if (!toolInvocations || !Array.isArray(toolInvocations) || toolInvocations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {toolInvocations.map(toolInvocation => {
        const { toolName, toolCallId, state } = toolInvocation;

        if (state === 'result') {
          if (toolName === 'displayWeather' && 'result' in toolInvocation) {
            const result = toolInvocation.result as {
              city: string;
              temperature: number;
              condition: string;
              humidity?: number;
              windSpeed?: number;
            };
            
            return (
              <Weather 
                key={toolCallId}
                location={result.city}
                temperature={result.temperature}
                weather={result.condition}
              />
            );
          }
        } else {
          // Handle loading state
          return (
            <div key={toolCallId} className="text-sm bg-gray-100 dark:bg-gray-800 rounded-md p-2">
              {toolName === 'displayWeather' ? (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">
                    <CloudRain className="h-4 w-4 text-blue-500" />
                  </div>
                  <span>Loading weather information...</span>
                </div>
              ) : (
                <div>Processing {toolName}...</div>
              )}
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}

export function AiChatBox({ id, userId, initialMessages }: AiChatBoxProps = {}) {
  const t = useTranslations('AiChat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [updatedChatId, setUpdatedChatId] = useState<string | null>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useSession();
  
  // Use provided userId or get from session
  const currentUserId = userId || user?.id;
  
  
  const { messages, input, handleInputChange, handleSubmit, error, status, stop, reload, setMessages } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    experimental_throttle: 50, // Lower this for more responsive streaming
    id, // Use the provided chat ID for persistence
    body: { 
      userId: currentUserId,
      // Add debug info to help track issues
      debug: {
        timestamp: new Date().toISOString(),
        source: 'AiChatBox',
        userIdType: typeof currentUserId
      } 
    }, // Send the user ID with each request
    initialMessages: initialMessages || [
      {
        id: 'initial-message',
        role: 'assistant',
        content: t('initialMessage')
      }
    ],
    sendExtraMessageFields: true, // Send id and createdAt for each message
    onError: (error) => {
      console.error('Chat error in onError handler:', error);
    },
    onResponse: (response) => {
      // Check if the server returned a new chat ID
      const chatId = response.headers.get('X-Chat-ID');
      if (chatId && chatId !== id) {
        console.log(`Received updated chat ID from server: ${chatId}`);
        setUpdatedChatId(chatId);
      }
      
      // Check if there's an auth-related error
      if (response.status === 400 && response.headers.get('X-Error-Type') === 'auth') {
        console.error('Authentication error detected');
        // Could redirect to login or show auth message
      }
    }
  });

  // Debug logging for messages
  useEffect(() => {
    // Log message content for debugging
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Add specific logs for weather detection
      if (lastMessage.role === 'assistant' && typeof lastMessage.content === 'string') {
        const content = lastMessage.content;
        const hasWeatherInfo = 
          (content.includes('Temperature:') && content.includes('Condition:')) ||
          (content.includes('weather') && content.includes('°C')) ||
          (content.includes('**Temperature:**') && content.includes('**Condition:**'));
        
        if (hasWeatherInfo) {
          console.log('🌤️ Detected weather info in text response:', {
            hasToolInvocations: !!lastMessage.toolInvocations,
            contentPreview: content.substring(0, 100),
            weatherTriggerWords: {
              temperature: content.includes('Temperature:') || content.includes('**Temperature:**'),
              condition: content.includes('Condition:') || content.includes('**Condition:**'),
              celsius: content.includes('°C'),
              markdown: content.includes('**')
            }
          });
        }
      }
      
      // Regular logging  
      console.log('Latest message:', {
        role: lastMessage.role,
        contentType: typeof lastMessage.content,
        contentPreview: typeof lastMessage.content === 'string' 
          ? lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : '')
          : String(lastMessage.content).substring(0, 100),
        isArray: Array.isArray(lastMessage.content),
        hasToolInvocations: !!lastMessage.toolInvocations
      });
      
      // Log tool invocations if present
      if (lastMessage.toolInvocations && lastMessage.toolInvocations.length > 0) {
        console.log('Tool invocations found!', {
          count: lastMessage.toolInvocations.length,
          details: lastMessage.toolInvocations,
          firstTool: lastMessage.toolInvocations[0],
          hasResult: lastMessage.toolInvocations[0]?.state === 'result'
        });
      } else {
        console.log('No tool invocations in message', {
          messageId: lastMessage.id,
          role: lastMessage.role,
          hasToolField: 'toolInvocations' in lastMessage,
          toolValue: lastMessage.toolInvocations
        });
      }
    }
    
    // Fix any malformed message content showing raw token format
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && typeof lastMessage.content === 'string') {
        const content = lastMessage.content;
        
        // Check if it starts with a potential token format
        if (content.startsWith('f:{"messageId":"') && content.includes('0:"')) {
          console.log('Detected raw token format in AiChatBox, attempting to fix');
          
          try {
            // Extract the actual text content from tokens
            const textContent = content
              .split('0:"')
              .slice(1)
              .map(part => part.split('"')[0])
              .join('');
            
            // Create a corrected deep copy of all messages
            const correctedMessages = messages.map((message, index) => {
              if (index === messages.length - 1 && message.role === 'assistant') {
                return { ...message, content: textContent };
              }
              return message;
            });
            
            // Set the corrected messages
            setMessages?.(correctedMessages);
          } catch (err) {
            console.error('Failed to fix tokenized message:', err);
          }
        }
      }
    }
  }, [messages, setMessages]);

  // If we received an updated ID, redirect to the correct chat page
  useEffect(() => {
    if (updatedChatId) {
      console.log(`Redirecting to updated chat ID: ${updatedChatId}`);
      router.replace(`/${locale}/chat/${updatedChatId}`);
    }
  }, [updatedChatId, router, locale]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      console.error('AI Chat error:', error);
      // Try to get more details if available
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }
  }, [error]);

  const handleClearChat = async () => {
    if (!currentUserId || isClearingChat) return;
    
    try {
      setIsClearingChat(true);
      const success = await clearUserChat(currentUserId);
      
      if (success) {
        // Reload the page to get a fresh chat
        window.location.reload();
      } else {
        console.error('Failed to clear chat');
      }
    } catch (error) {
      console.error('Error clearing chat:', error);
    } finally {
      setIsClearingChat(false);
    }
  };

  const messageVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 1, 1]
      }
    }
  };

  return (
    <Card className="h-[600px] flex flex-col bg-white/50 dark:bg-black/90 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{t('title')}</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearChat}
            disabled={isClearingChat || !currentUserId}
            title={t('clearChat') || "Clear chat"}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            title={t('refresh')}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {(status === 'submitted' || status === 'streaming') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => stop()}
              className="flex items-center gap-1"
            >
              <StopCircle className="h-4 w-4 mr-1" />
              {t('stop') || "Stop"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 mb-4 h-full" ref={scrollAreaRef}>
          <div className="py-4">
            {error && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-400">{t('errorTitle') || "Error"}</h4>
                <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => reload()}
                  className="mt-2 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t('retry') || "Retry"}
                </Button>
              </div>
            )}
            
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={messageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  layout
                  className={`flex items-start space-x-2 mb-4 ${
                    message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Avatar className={`h-8 w-8 ${
                      message.role === 'assistant' 
                        ? 'bg-blue-500 dark:bg-blue-600' 
                        : 'bg-green-500 dark:bg-green-600'
                    }`}>
                      <AvatarImage src="" alt="" className="flex h-full w-full items-center justify-center">
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </AvatarImage>
                      <AvatarFallback>
                        {message.role === 'assistant' ? 'AI' : 'You'}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.5, x: message.role === 'assistant' ? -20 : 20 }}
                    animate={{ scale: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === 'assistant'
                        ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100'
                        : 'bg-blue-500/90 dark:bg-blue-600/90 text-white'
                    }`}
                  >
                    {renderMessageContent(message.content)}
                    {message.toolInvocations && renderToolInvocations(message.toolInvocations)}
                    
                    {/* Debug information - remove in production */}
                    {process.env.NODE_ENV !== 'production' && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <details className="text-xs text-gray-500">
                          <summary>Debug info</summary>
                          <pre className="mt-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto">
                            {JSON.stringify({
                              id: message.id,
                              role: message.role,
                              hasToolInvocations: Boolean(message.toolInvocations),
                              toolCount: message.toolInvocations?.length || 0,
                              tools: message.toolInvocations?.map(t => ({
                                name: t.toolName,
                                state: t.state,
                                hasResult: 'result' in t
                              }))
                            }, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {status === 'submitted' && (
              <div className="flex justify-center my-2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={t('placeholder')}
              disabled={status !== 'ready' || error !== undefined}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || status !== 'ready' || error !== undefined}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}