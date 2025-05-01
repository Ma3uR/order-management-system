"use client"

import { FormEvent, Dispatch, SetStateAction } from 'react'
import { Input } from "@/app/components/shared/ui/input"
import { Button } from "@/app/components/shared/ui/button"
import { StopCircle } from 'lucide-react'
import { Attachment, Message } from 'ai'
import { useTranslations } from 'next-intl'

interface MultimodalInputProps {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  status: 'idle' | 'ready' | 'streaming' | 'submitted' | 'stopped' | 'error';
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  append: (message: Message) => Promise<string | null | undefined>;
}

export function MultimodalInput({
  chatId,
  input,
  setInput,
  handleSubmit,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append
}: MultimodalInputProps) {
  const t = useTranslations('AiChat')
  
  return (
    <div className="flex gap-2 w-full">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={t('inputPlaceholder') || "Type your message..."}
        className="flex-1"
        disabled={status !== 'ready'}
      />
      
      {status === 'streaming' || status === 'submitted' ? (
        <Button 
          variant="outline" 
          onClick={() => stop()}
          className="flex items-center gap-1"
        >
          <StopCircle className="h-4 w-4" />
          {t('stop') || "Stop"}
        </Button>
      ) : (
        <Button 
          type="submit" 
          disabled={!input.trim() || status !== 'ready'}
        >
          {t('send') || "Send"}
        </Button>
      )}
    </div>
  )
} 