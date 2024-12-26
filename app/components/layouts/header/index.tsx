import { Button } from "@/app/components/shared/ui/button"
import Link from 'next/link'
import LanguageSwitcher  from "@/app/components/shared/ui/LanguageSwitcher"
import { ThemeToggle } from "@/app/components/shared/ui/ThemeToggle"
import { ArrowLeft } from 'lucide-react'
import { SidebarTrigger } from "@/app/components/shared/ui/sidebar"

interface HeaderProps {
  translations: {
    backToDashboard: string;
  };
}

export function Header({ translations }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <div className="md:hidden">
          <SidebarTrigger location="header" />
        </div>
        <div className="hidden md:block">
          <Link href="/dashboard" passHref>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{translations.backToDashboard}</span>
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}

