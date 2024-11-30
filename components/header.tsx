import { ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import LanguageSwitcher from "@/components/LanguageSwitcher"

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
            {translations.backToDashboard}
          </Button>
        </Link>
      </div>
      <div className="flex justify-between items-center gap-4 mr-8">
        <LanguageSwitcher />
      </div>
    </header>
  )
}

