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
    // Log auth state on each effect run
    console.log('[useAuth] Auth check on:', pathname, {
      required,
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      effectTriggered: Date.now()
    });
    
    // Only run this effect after initial loading is complete
    if (isLoading) {
      console.log('[useAuth] Still loading, skipping redirect check');
      return;
    }

    // If authentication is required but the user is not authenticated
    if (required && !isAuthenticated) {
      // Simple direct navigation to login page without callback
      const localizedLoginPath = `/${locale}${redirectTo}`;
      console.log(`[useAuth] Auth required but not authenticated, redirecting to ${localizedLoginPath}`);
      
      // Set a flag in sessionStorage to prevent potential redirect loops
      if (typeof window !== 'undefined') {
        // Check if we've already attempted this redirect recently
        const lastRedirect = sessionStorage.getItem('last_auth_redirect');
        const now = Date.now();
        
        if (lastRedirect) {
          const timeSinceLastRedirect = now - parseInt(lastRedirect, 10);
          // If we redirected less than 2 seconds ago, don't redirect again
          if (timeSinceLastRedirect < 2000) {
            console.log('[useAuth] Preventing redirect loop, last redirect was', 
              timeSinceLastRedirect, 'ms ago');
            return;
          }
        }
        
        // Update last redirect timestamp
        sessionStorage.setItem('last_auth_redirect', now.toString());
      }
      
      // Execute redirect
      router.push(localizedLoginPath);
      
      // Fallback to direct navigation if router push doesn't work
      setTimeout(() => {
        if (typeof window !== 'undefined' && 
            window.location.pathname === pathname && 
            required && !isAuthenticated) {
          console.log('[useAuth] Using fallback direct navigation');
          window.location.href = localizedLoginPath;
        }
      }, 500);
    } else if (!required && isAuthenticated) {
      console.log('[useAuth] User authenticated on non-required page');
    } else {
      console.log('[useAuth] No redirect needed', { required, isAuthenticated });
    }
  }, [isAuthenticated, isLoading, required, redirectTo, router, pathname, locale, user]);

  return { user, isLoading, isAuthenticated };
} 