'use client';

import { useState } from "react"
import { Check, Globe } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

/**
 * Renders a language switcher component with a dropdown menu.
 * This component allows users to change the current language of the application.
 * It displays the current language and provides options to switch to other available languages.
 * @returns {JSX.Element} A dropdown menu component for language selection.
 */
export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const currentLocale = useLocale()
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    languages.find((l) => l.code === currentLocale) || languages[0]
  )

  const changeLanguage = (language: Language) => {
    const newPath = pathname.replace(`/${currentLocale}`, `/${language.code}`)
    setCurrentLanguage(language)
    router.push(newPath)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md"
        >
          <Globe className="h-5 w-5" />
          <span>{currentLanguage.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language)}
            className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.name}</span>
            </span>
            {currentLanguage.code === language.code && (
              <Check className="h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 