'use client';

import { Globe } from "lucide-react"
import { Button } from "@/app/components/shared/ui/button"
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

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
      className="flex items-center gap-2 h-8 px-3 text-xs"
    >
      <Globe className="h-4 w-4" />
      <span>
        {locale === 'en' ? 'Українська' : 'English'}
      </span>
    </Button>
  )
}
