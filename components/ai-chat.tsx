"use client"

import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTranslations } from 'next-intl'

export function AiChat() {
  const t = useTranslations('AiChat')

  return (
    <Card className="w-full shadow-lg dark:bg-gray-800">
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar>
          <AvatarFallback>
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold dark:text-gray-100">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('comingSoon')}</p>
        </div>
      </CardHeader>
      <CardContent className="h-[320px] border-y bg-muted/50 dark:bg-gray-900/50 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5">
            <AvatarFallback>
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="rounded-xl rounded-tl-none bg-primary px-4 py-2 text-primary-foreground">
            {t('initialMessage')}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4">
        <form className="flex w-full gap-2">
          <Input disabled placeholder={t('placeholder')} className="dark:bg-gray-700" />
          <Button disabled type="submit">
            {t('send')}
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
} 