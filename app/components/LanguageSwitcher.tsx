'use client';

import { Globe } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/app/components/ui/button"
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

  const switchLanguage = (newLocale: string) => {
    const currentPath = window.location.pathname
    // Remove the current locale from path
    const pathWithoutLocale = currentPath.replace(/^\/[^/]+/, '')
    // Add new locale
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
