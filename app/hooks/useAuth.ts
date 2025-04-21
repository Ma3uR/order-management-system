'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/app/components/features/dashboard/useSession';

export function useAuth({ required = true, redirectTo = '/login' } = {}) {
  const { user, isLoading, isAuthenticated } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run this effect after initial loading is complete
    if (isLoading) return;

    // If authentication is required but the user is not authenticated
    if (required && !isAuthenticated) {
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, required, redirectTo, router, pathname]);

  return { user, isLoading, isAuthenticated };
} 