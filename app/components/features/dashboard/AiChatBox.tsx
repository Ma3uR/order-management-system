'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { ScrollArea } from "@/app/components/shared/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/shared/ui/avatar";
import { Send, Bot, User, StopCircle, RefreshCw, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from '@ai-sdk/react';
import { Message } from 'ai';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { clearUserChat } from '@/app/lib/chat-store';
import { useSession } from './useSession';

interface AiChatBoxProps {
  id?: string;
  userId?: string;
  initialMessages?: Message[];
}

export function AiChatBox({ id, userId, initialMessages }: AiChatBoxProps = {}) {
  const t = useTranslations('AiChat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [updatedChatId, setUpdatedChatId] = useState<string | null>(null);
  const [isClearingChat, setIsClearingChat] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { user, isLoading: isSessionLoading } = useSession();
  
  // Use provided userId or get from session
  const currentUserId = userId || user?.id;
  
  // Debug logging for props
  useEffect(() => {
    console.log(`AiChatBox mounted with id: ${id}, userId param: "${userId}"`);
    console.log(`Session user:`, user);
    console.log(`Current user ID being used: "${currentUserId}", type: ${typeof currentUserId}`);
    console.log(`Initial messages:`, initialMessages);
    console.log(`Initial message count: ${initialMessages ? initialMessages.length : 0}`);
    
    // Log authentication state
    console.log('Authentication state:', {
      user,
      isSessionLoading,
      currentUserId,
      isAuthenticated: !!user
    });
  }, [id, currentUserId, initialMessages, user, isSessionLoading, userId]);
  
  const { messages, input, handleInputChange, handleSubmit, error, status, stop, reload } = useChat({
    api: '/api/chat',
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
    console.log(`Current messages state:`, messages);
    console.log(`Current message count: ${messages.length}`);
  }, [messages]);

  // If we received an updated ID, redirect to the correct chat page
  useEffect(() => {
    if (updatedChatId) {
      console.log(`Redirecting to updated chat ID: ${updatedChatId}`);
      router.replace(`/${locale}/chat/${updatedChatId}`);
    }
  }, [updatedChatId, router, locale]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
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
    <Card className="h-[500px] flex flex-col bg-white/50 dark:bg-black/90 backdrop-blur-sm">
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
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4 mb-4" ref={scrollAreaRef}>
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
                  {message.content}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {status === 'submitted' && (
            <div className="flex justify-center my-2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
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