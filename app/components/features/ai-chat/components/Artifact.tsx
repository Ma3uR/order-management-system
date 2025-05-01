"use client"

import { Dispatch, FormEvent, SetStateAction } from 'react'
import { Attachment, Message } from 'ai'

interface ArtifactProps {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  status: 'idle' | 'ready' | 'streaming' | 'submitted' | 'stopped' | 'error';
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  append: (message: Message) => Promise<string | null | undefined>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  reload: () => void;
  votes?: any[];
  isReadonly: boolean;
}

export function Artifact({
  chatId,
  input,
  setInput,
  handleSubmit,
  status,
  stop,
  attachments,
  setAttachments,
  append,
  messages,
  setMessages,
  reload,
  votes,
  isReadonly
}: ArtifactProps) {
  // Placeholder component - not fully implemented
  return null;
} 