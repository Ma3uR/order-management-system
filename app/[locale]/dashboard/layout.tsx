'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
import { Toaster } from "@/app/components/shared/ui/toaster";
import { useSession } from "@/app/components/features/dashboard/useSession";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useSession();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    // If session loaded and user is not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      console.log('No authenticated session found, redirecting to login');
      // Use the current window location for redirects instead of hardcoded paths
      const baseUrl = window.location.origin;
      router.push(`${baseUrl}/${locale}/login`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render children
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
      <Toaster />
    </ThemeProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations('Dashboard');
  const { isLoading, isAuthenticated } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Use the current window location for redirects
      const baseUrl = window.location.origin;
      router.push(`${baseUrl}/${locale}/login`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
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
        </header>
        <main className="flex-1 px-2 py-2 sm:px-3 sm:py-3 md:p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
