"use client"

import type { Attachment } from 'ai'
import { useChat } from '@ai-sdk/react'
import { useState, useEffect } from 'react'
import { Card } from "@/app/components/shared/ui/card"
import pb from '@/app/lib/pocketbase'
import { useTranslations } from 'next-intl'
import { generateUUID } from '@/app/lib/utils'
import { useArtifactSelector, ArtifactState } from '@/app/hooks/use-artifact'
import { toast } from './toast'
import { Messages } from './Messages'
import { ChatHeader, VisibilityType } from './ChatHeader'
import { MultimodalInput } from './MultimodalInput'
import { Artifact } from './Artifact'

interface AiChatProps {
  id?: string;
  selectedChatModel?: string;
  selectedVisibilityType?: VisibilityType;
  isReadonly?: boolean;
}

export function AiChat({
  id = generateUUID(),
  selectedChatModel = 'gpt-3.5-turbo',
  selectedVisibilityType = 'private',
  isReadonly = false,
}: AiChatProps) {
  const t = useTranslations('AiChat')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const isArtifactVisible = useArtifactSelector((state: ArtifactState) => state.isVisible)
  
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    error
  } = useChat({
    api: '/api/chat',
    streamProtocol: 'text',
    id,
    experimental_throttle: 50, // Add for smoother streaming
    initialMessages: [
      {
        id: 'initial-message',
        role: 'assistant',
        content: t('initialMessage'),
      }
    ],
    generateId: generateUUID,
    experimental_prepareRequestBody: (body) => ({
      id,
      userId: pb.authStore.model?.id,
      message: body.messages.at(-1),
      selectedChatModel,
    }),
    onError: (error) => {
      console.error('Chat error:', error)
      toast({
        type: 'error',
        description: error.message,
      })
    }
  })

  // Handler to fix any malformed message content
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Check if any message has malformed content with raw token format 
      // (like "f:{...} 0:"I'm " 0:"here "...)
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage && typeof lastMessage.content === 'string') {
        const content = lastMessage.content;
        
        // Check if it starts with a potential token format
        if (content.startsWith('f:{"messageId":"') && content.includes('0:"')) {
          console.log('Detected raw token format, attempting to fix');
          
          try {
            // Extract the actual text content from tokens
            const textContent = content
              .split('0:"')
              .slice(1)
              .map(part => part.split('"')[0])
              .join('');
            
            // Create a fixed message array
            const fixedMessages = [...messages];
            fixedMessages[fixedMessages.length - 1] = {
              ...lastMessage,
              content: textContent
            };
            
            // Update the messages state
            setMessages(fixedMessages);
          } catch (err) {
            console.error('Failed to fix tokenized message:', err);
          }
        }
      }
    }
  }, [messages, setMessages]);

  const session = {
    user: {
      id: pb.authStore.model?.id,
      name: pb.authStore.model?.name,
      email: pb.authStore.model?.email,
    }
  }

  return (
    <>
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 w-full p-4 flex flex-col">
          <Card className="w-full shadow-lg dark:bg-gray-800 flex flex-col h-full">
            <ChatHeader
              chatId={id}
              selectedModelId={selectedChatModel}
              selectedVisibilityType={selectedVisibilityType}
              isReadonly={isReadonly}
              session={session}
            />

            <Messages
              chatId={id}
              status={status}
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
              isArtifactVisible={isArtifactVisible}
              error={error}
            />
            
            <div className="border-t p-4 w-full">
              {!isReadonly && (
                <form onSubmit={handleSubmit} className="flex gap-2 w-full">
                  <MultimodalInput
                    chatId={id}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleSubmit}
                    status={status}
                    stop={stop}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    messages={messages}
                    setMessages={setMessages}
                    append={append}
                  />
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        isReadonly={isReadonly}
      />
    </>
  )
} 