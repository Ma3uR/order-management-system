'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/app/components/features/dashboard/useSession';
import { useLocale } from 'next-intl';

export function useAuth({ required = true, redirectTo = '/login' } = {}) {
  const { user, isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    // Only run this effect after initial loading is complete
    if (isLoading) return;

    // If authentication is required but the user is not authenticated
    if (required && !isAuthenticated) {
      // Simple direct navigation to login page without callback
      const localizedLoginPath = `/${locale}${redirectTo}`;
      console.log(`Auth required but not authenticated, redirecting to ${localizedLoginPath}`);
      router.push(localizedLoginPath);
    }
  }, [isAuthenticated, isLoading, required, redirectTo, router, pathname, locale]);

  return { user, isLoading, isAuthenticated };
} 