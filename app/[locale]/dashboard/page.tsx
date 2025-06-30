'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useSession } from '@/app/hooks/useSession';
import Dashboard from '@/app/components/features/dashboard/Dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const locale = useLocale();
  const { isLoading, isAuthenticated } = useSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[DashboardPage] User not authenticated, redirecting to login');
      router.push(`/${locale}/login`);
    }
  }, [isLoading, isAuthenticated, router, locale]);

  // Show loading while checking authentication
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

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return <Dashboard />;
}
