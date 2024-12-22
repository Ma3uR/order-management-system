'use client';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/app/components/layouts/AppSidebar';
import { Header } from '@/app/components/layouts/header';
import { Footer } from '@/app/components/layouts/footer';
import { default as BlacklistManagement } from '@/app/components/features/blacklist/index';
import { Toaster } from 'sonner';

interface BlacklistPageClientProps {
  translations: {
    backToDashboard: string;
  };
}

export default function BlacklistPageClient({ translations }: BlacklistPageClientProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <SidebarProvider defaultOpen>
          <div className="min-h-screen flex">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <Header translations={translations} />
              <main className="flex-1 p-8">
                <BlacklistManagement />
              </main>
              <Footer />
            </div>
          </div>
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