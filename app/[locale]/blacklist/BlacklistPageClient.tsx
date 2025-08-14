'use client';

import { ThemeProvider } from 'next-themes';
import { SidebarProvider, SidebarTrigger } from '@/app/components/shared/ui/sidebar';
import { AppSidebar } from '@/app/components/layouts/AppSidebar';
import { Separator } from "@/app/components/shared/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/app/components/shared/ui/breadcrumb";
import { SidebarInset } from "@/app/components/shared/ui/sidebar";
import BlacklistManager from '@/app/components/features/blacklist/BlacklistManager';
import { Toaster } from 'sonner';
import { motion } from 'framer-motion';
import LanguageToggle from '@/app/components/shared/ui/LanguageSwitcher';
import { ThemeToggle } from '@/app/components/shared/ui/ThemeToggle';
import { useTranslations } from 'next-intl';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

interface BlacklistPageClientProps {
  translations: {
    backToDashboard: string;
  };
}

export default function BlacklistPageClient({}: BlacklistPageClientProps) {
  const t = useTranslations('Blacklist');
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="h-screen flex flex-col overflow-hidden w-full">
          <header className="sticky top-0 flex h-10 sm:h-14 shrink-0 items-center gap-1 bg-background overflow-hidden z-10">
            <div className="flex flex-1 items-center gap-1 px-1 sm:px-2 overflow-hidden">
              <div className="md:hidden">
                <SidebarTrigger location="header" />
              </div>
              <Separator orientation="vertical" className="mr-1 h-4 hidden sm:block" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="line-clamp-1 text-xs sm:text-sm">
                      {t('title')}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="flex items-center gap-1 px-1 sm:px-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 px-2 py-4 sm:px-4 sm:py-6 overflow-y-auto overflow-x-hidden">
            <motion.div 
              className="w-full space-y-3 sm:space-y-6"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div 
                className="flex flex-col gap-1 sm:gap-4 mb-2 sm:mb-6"
                variants={fadeIn}
              >
                <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground">
                  {t('title')}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {t('description')}
                </p>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="w-full"
              >
                <BlacklistManager />
              </motion.div>
            </motion.div>
          </main>
        </SidebarInset>
        <Toaster
          position="top-right"
          expand={true}
          richColors
          closeButton
          className="transform-gpu"
        />
      </SidebarProvider>
    </ThemeProvider>
  );
} 