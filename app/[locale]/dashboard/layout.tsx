'use client';

import { SessionProvider } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LanguageSwitcher from '@/app/components/shared/ui/LanguageSwitcher';
import { ThemeToggle } from '@/app/components/shared/ui/ThemeToggle';
import { ThemeProvider } from 'next-themes';
import { AppSidebar } from '@/app/components/layouts/AppSidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/app/components/shared/ui/sidebar';
import { Separator } from '@/app/components/shared/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/app/components/shared/ui/breadcrumb';
import { Footer } from '@/app/components/layouts/footer';
import { Toaster } from "@/app/components/shared/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Dashboard');
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen flex flex-col">
        <header className="sticky top-0 flex h-14 shrink-0 items-center gap-1 bg-background overflow-hidden z-10">
          <div className="flex flex-1 items-center gap-1 px-2 overflow-hidden">
            <div className="md:hidden">
              <SidebarTrigger location="header" />
            </div>

            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1 text-sm">
                    {t('dashboard')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-1 px-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-2 py-2 sm:px-3 sm:py-3 md:p-4 overflow-y-auto">
          {children}
        </main>
        <div className="shrink-0">
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
