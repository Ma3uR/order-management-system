'use client';

import { Globe } from "lucide-react"
import { Button } from "@/app/components/shared/ui/button"
import { useLocale } from 'next-intl'

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ua", name: "Українська", flag: "🇺🇦" },
]

export default function LanguageSwitcher() {
  const currentLocale = useLocale()

  const switchLanguage = (newLocale: string) => {
    const currentPath = window.location.pathname
    const pathWithoutLocale = currentPath.replace(/^\/[^/]+/, '')
    const newPath = `/${newLocale}${pathWithoutLocale}`
    window.location.href = newPath
  }

  return (
    <Button
      onClick={() => switchLanguage(languages[currentLocale === 'en' ? 1 : 0].code)}
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {currentLocale === 'en' ? 'Українська' : 'English'}
      </span>
    </Button>
  )
}
