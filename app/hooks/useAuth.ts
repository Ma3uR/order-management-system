'use client';

import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/app/lib/pocketbase';
import { useLocale } from 'next-intl';
import PocketBase from 'pocketbase';
import * as dotenv from 'dotenv';
dotenv.config();

// Get PocketBase instance directly rather than importing a named export
let pb: PocketBase;
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  const getPocketBaseUrl = () => {
    const url = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `http://${url}`;
    }
    return url;
  };
  
  pb = new PocketBase(getPocketBaseUrl());
  
  // Try to restore auth from localStorage if needed
  try {
    const storedAuthData = localStorage.getItem('pocketbase_auth');
    if (storedAuthData) {
      const authData = JSON.parse(storedAuthData);
      pb.authStore.save(authData.token, authData.model);
    }
  } catch (err) {
    console.error('[useAuth] Error loading auth from localStorage:', err);
  }
}

export type UseAuthProps = {
  required?: boolean;
  redirectTo?: string;
  redirectIfFound?: boolean;
};

/**
 * A custom hook for client-side authentication handling that replaces middleware
 * @param required Whether authentication is required (defaults to false)
 * @param redirectTo Where to redirect if not authenticated (defaults to '')
 * @param redirectIfFound Whether to redirect if authenticated (defaults to false)
 */
export function useAuth({
  required = false,
  redirectTo = '',
  redirectIfFound = false,
}: UseAuthProps = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(typeof window !== 'undefined' ? pb?.authStore?.model : null);
  const locale = useLocale();

  useEffect(() => {
    if (typeof window === 'undefined') {
      // Skip on server
      setIsLoading(false);
      return;
    }
    
    if (!pb.authStore.isValid) {
      // Clear any stale data
      if (pb.authStore.model) {
        pb.authStore.clear();
      }
    }

    // Subscribe to auth store changes
    pb.authStore.onChange(() => {
      setUser(pb.authStore.model);
    });

    // Check current auth state
    const checkAuth = async () => {
      setIsLoading(true);
      
      try {
        const isUserAuthenticated = isAuthenticated();
        console.log('[useAuth] Authentication check:', isUserAuthenticated);
        
        // Prevent redirect loops by checking sessionStorage
        const lastRedirect = sessionStorage.getItem('lastAuthRedirect');
        const now = Date.now();
        const redirectRecently = lastRedirect && now - parseInt(lastRedirect) < 5000;

        if (!redirectRecently) {
          if (required && !isUserAuthenticated) {
            console.log('[useAuth] Auth required but user not authenticated, redirecting to login');
            sessionStorage.setItem('lastAuthRedirect', now.toString());
            
            // Redirect to login with locale
            window.location.href = `/${locale}/login`;
            return;
          }

          if (redirectIfFound && isUserAuthenticated && redirectTo) {
            console.log('[useAuth] User authenticated and redirectIfFound is true, redirecting to', redirectTo);
            sessionStorage.setItem('lastAuthRedirect', now.toString());
            
            // Append locale to redirect path if it doesn't already include it
            const localizedRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith(`/${locale}`) 
              ? `/${locale}${redirectTo}` 
              : redirectTo;
              
            window.location.href = localizedRedirect;
            return;
          }
        }
      } catch (error) {
        console.error('[useAuth] Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Cleanup
    return () => {
      // Nothing to clean up
    };
  }, [required, redirectIfFound, redirectTo, locale]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
  };
} 