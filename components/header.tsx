import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import LanguageSwitcher from "@/components/LanguageSwitcher"
import { ThemeToggle } from "@/components/ThemeToggle"

interface HeaderProps {
  translations: {
    backToDashboard: string;
  };
}

export function Header({ translations }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" passHref>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{translations.backToDashboard}</span>
          </Button>
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}

