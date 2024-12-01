"use client"

import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { useEffect, useState } from 'react'

export function AiChat() {
  const t = useTranslations('AiChat')
  const [displayedText, setDisplayedText] = useState('')
  const fullText = t('initialMessage')

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 50) // Adjust speed of typing here

    return () => clearInterval(timer)
  }, [fullText])

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full shadow-lg dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center gap-3 p-4">
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarFallback>
              <Bot className="h-4 w-4 md:h-5 md:w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm md:text-base font-semibold dark:text-gray-100">{t('title')}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">{t('comingSoon')}</p>
          </div>
        </CardHeader>
        <CardContent className="h-[240px] md:h-[320px] border-y bg-muted/50 dark:bg-gray-900/50 p-4">
          <div className="flex items-start gap-3">
            <Avatar className="mt-0.5">
              <AvatarFallback>
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="rounded-xl rounded-tl-none bg-primary px-4 py-2 text-primary-foreground"
            >
              {displayedText}
            </motion.div>
          </div>
        </CardContent>
        <CardFooter className="p-4">
          <form className="flex w-full gap-2">
            <Input 
              disabled 
              placeholder={t('placeholder')} 
              className="dark:bg-gray-700 text-sm md:text-base" 
            />
            <Button disabled type="submit" className="whitespace-nowrap">
              {t('send')}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 