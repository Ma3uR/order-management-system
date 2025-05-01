"use client"

import { User, Bot, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/app/components/shared/ui/avatar"
import { motion } from "framer-motion"
import { Dispatch, SetStateAction } from 'react'
import { Alert, AlertDescription, AlertTitle } from "@/app/components/shared/ui/alert"
import { Button } from "@/app/components/shared/ui/button"
import { useTranslations } from 'next-intl'
import { Message } from 'ai'
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"

interface MessagesProps {
  chatId: string;
  status: 'idle' | 'ready' | 'streaming' | 'submitted' | 'stopped' | 'error';
  votes?: any[];
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  reload: () => void;
  isReadonly: boolean;
  isArtifactVisible?: boolean;
  error?: Error;
}

export function Messages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  isArtifactVisible,
  error
}: MessagesProps) {
  const t = useTranslations('AiChat')

  return (
    <ScrollArea className="flex-1">
      <div className="h-[400px] border-y bg-muted/50 dark:bg-gray-900/50 p-4 overflow-y-auto">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>{t('errorTitle') || "An error occurred"}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error.message}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => reload()}
                className="flex items-center gap-1 self-start"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('retry') || "Retry"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {messages.map(message => (
          <div key={message.id} className="flex items-start gap-3 mb-4">
            <Avatar className="mt-0.5">
              <AvatarFallback>
                {message.role === 'assistant' ? (
                  <Bot className="h-5 w-5" />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </AvatarFallback>
            </Avatar>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`rounded-xl ${
                message.role === 'assistant' 
                  ? 'rounded-tl-none bg-primary text-primary-foreground' 
                  : 'rounded-tr-none bg-muted text-muted-foreground'
              } px-4 py-2`}
            >
              {message.content}
            </motion.div>
          </div>
        ))}
        
        {(status === 'submitted' || status === 'streaming') && (
          <div className="flex justify-center mt-2">
            {status === 'submitted' && (
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 