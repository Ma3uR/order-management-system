'use client';

import { Globe } from "lucide-react"
import { Button } from "@/app/components/shared/ui/button"
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { Link } from 'next-intl';

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
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLanguage = (newLocale: string) => {
    // Get the target language
    const targetLocale = newLocale
    
    // Get path without locale prefix
    const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '')
    
    // Create new path with target locale
    const newPath = `/${targetLocale}${pathWithoutLocale}`
    
    // Navigate to the new path
    router.push(newPath)
  }

  return (
    <Button
      onClick={() => switchLanguage(locale === 'en' ? 'ua' : 'en')}
      variant="ghost"
      size="sm"
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      <span className="hidden sm:inline">
        {locale === 'en' ? 'Українська' : 'English'}
      </span>
    </Button>
  )
}
