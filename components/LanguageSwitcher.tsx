'use client';

import { Globe } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()

  const changeLanguage = (language: Language) => {
    if (!pathname) return;
    const newPath = pathname.replace(`/${currentLocale}`, `/${language.code}`)
    router.push(newPath)
  }

  return (
    <Button
      onClick={() => changeLanguage(languages[currentLocale === 'en' ? 1 : 0])}
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
