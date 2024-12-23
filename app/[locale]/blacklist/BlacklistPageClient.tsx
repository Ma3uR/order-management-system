'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/app/components/shared/ui/sidebar';
import { AppSidebar } from '@/app/components/layouts/AppSidebar';
import { Separator } from "@/app/components/shared/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/app/components/shared/ui/breadcrumb";
import { SidebarInset, SidebarTrigger } from "@/app/components/shared/ui/sidebar";
import { default as BlacklistManagement } from '@/app/components/features/blacklist/index';
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

export default function BlacklistPageClient({ translations }: BlacklistPageClientProps) {
  const t = useTranslations('Blacklist');
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <SidebarProvider defaultOpen>
          <AppSidebar />
          <SidebarInset>
            <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 border-b bg-background">
              <div className="flex flex-1 items-center gap-2 px-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="line-clamp-1">
                        {t('title')}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="flex items-center gap-2 px-3">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </header>
            <motion.div 
              className="container mx-auto p-6 space-y-6"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div 
                className="flex flex-col gap-4 mb-6"
                variants={fadeIn}
              >
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {t('title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('description')}
                </p>
              </motion.div>
              <motion.div
                variants={fadeIn}
                className="w-full"
              >
                <BlacklistManagement />
              </motion.div>
            </motion.div>
          </SidebarInset>
          <Toaster
            position="top-right"
            expand={true}
            richColors
            closeButton
            className="transform-gpu"
          />
        </SidebarProvider>
      </SessionProvider>
    </ThemeProvider>
  );
} 