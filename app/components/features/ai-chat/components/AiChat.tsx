"use client"

import { Bot, User, StopCircle, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/app/components/shared/ui/avatar"
import { Card, CardContent, CardHeader } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { Alert, AlertDescription, AlertTitle } from "@/app/components/shared/ui/alert"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"

export function AiChat() {
  const t = useTranslations('AiChat')
  const messagesRef = useRef<HTMLDivElement>(null)
  
  const { messages, input, handleInputChange, handleSubmit, error, status, stop, reload } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    initialMessages: [
      {
        id: 'initial-message',
        role: 'assistant',
        content: t('initialMessage'),
      }
    ]
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 w-full p-4 flex flex-col">
        <Card className="w-full shadow-lg dark:bg-gray-800 flex flex-col h-full">
          <CardHeader className="flex flex-row items-center gap-3 p-4">
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarFallback>
                <Bot className="h-4 w-4 md:h-5 md:w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm md:text-base font-semibold dark:text-gray-100">{t('title')}</h3>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent 
              ref={messagesRef}
              className="h-[400px] border-y bg-muted/50 dark:bg-gray-900/50 p-4 overflow-y-auto"
            >
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => stop()}
                    className="flex items-center gap-1"
                  >
                    <StopCircle className="h-4 w-4" />
                    {t('stop') || "Stop"}
                  </Button>
                </div>
              )}
            </CardContent>
          </ScrollArea>
          
          <div className="border-t p-4 w-full">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder={t('inputPlaceholder') || "Type your message..."}
                className="flex-1"
                disabled={status !== 'ready' || error !== undefined}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || status !== 'ready' || error !== undefined}
              >
                {t('send') || "Send"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
} 