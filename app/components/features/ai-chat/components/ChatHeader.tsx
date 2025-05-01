"use client"

import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/app/components/shared/ui/avatar"
import { useTranslations } from 'next-intl'
import { CardHeader } from "@/app/components/shared/ui/card"

export type VisibilityType = 'public' | 'private'

interface ChatHeaderProps {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: any;
}

export function ChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session
}: ChatHeaderProps) {
  const t = useTranslations('AiChat')

  return (
    <CardHeader className="flex flex-row items-center gap-3 p-4">
      <Avatar className="h-8 w-8 md:h-10 md:w-10">
        <AvatarFallback>
          <Bot className="h-4 w-4 md:h-5 md:w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm md:text-base font-semibold dark:text-gray-100">{t('title')}</h3>
        {selectedModelId && (
          <p className="text-xs text-muted-foreground">
            {selectedModelId}
          </p>
        )}
      </div>
    </CardHeader>
  )
} 