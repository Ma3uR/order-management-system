'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { ScrollArea } from "@/app/components/shared/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/shared/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

export function AiChatBox() {
  const t = useTranslations('AiChat');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: t('initialMessage')
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('comingSoon')
      }]);
      setIsLoading(false);
    }, 1000);
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
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4 mb-4" ref={scrollAreaRef}>
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
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
        </ScrollArea>

        <div className="border-t">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('placeholder')}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={isLoading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
} 