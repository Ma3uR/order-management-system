'use client';

import { useState, useEffect, useCallback } from 'react';
import pb from '@/app/lib/pocketbase';

interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Create a standalone function to check auth state that can be called multiple times
  const checkAuthState = useCallback(async () => {
    try {
      if (!initialized) {
        console.log('[useSession] Initializing auth state check');
      }
      
      // If we're running in the browser, log some diagnostic info
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        console.log('[useSession] Auth check on:', pathname, window.location.origin);
        console.log('[useSession] Auth state check:', {
          hasAuthStore: !!pb.authStore,
          isValid: pb.authStore?.isValid,
          hasToken: !!pb.authStore?.token,
          modelType: pb.authStore?.model?.type,
          modelId: pb.authStore?.model?.id
        });
      }
      
      // If we have a valid auth, use it
      if (pb.authStore.isValid && pb.authStore.model) {
        console.log('[useSession] Using existing valid auth');
        setUser({
          id: pb.authStore.model.id,
          email: pb.authStore.model.email,
          name: pb.authStore.model.name,
          username: pb.authStore.model.username,
          avatar: pb.authStore.model.avatar,
        });
        console.log('[useSession] User set from valid auth:', pb.authStore.model.id);
      } else {
        // No valid auth, try to refresh it
        try {
          if (pb.authStore.token) {
            console.log('[useSession] Trying to refresh auth with token');
            // Try to refresh token if we have one
            await pb.collection('users').authRefresh();
            
            if (pb.authStore.isValid && pb.authStore.model) {
              console.log('[useSession] Auth refresh successful');
              setUser({
                id: pb.authStore.model.id,
                email: pb.authStore.model.email,
                name: pb.authStore.model.name,
                username: pb.authStore.model.username,
                avatar: pb.authStore.model.avatar,
              });
              console.log('[useSession] User set after refresh:', pb.authStore.model.id);
            } else {
              console.log('[useSession] Auth refresh completed but still not valid');
              pb.authStore.clear();
              setUser(null);
            }
          } else {
            console.log('[useSession] No token to refresh');
            setUser(null);
          }
        } catch (refreshError) {
          console.error('[useSession] Failed to refresh auth:', refreshError);
          pb.authStore.clear();
          setUser(null);
        }
      }
      
      setIsLoading(false);
      setInitialized(true);
      
      // Return the current user status
      return !!pb.authStore.isValid;
    } catch (err) {
      console.error('[useSession] Auth check error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error checking session'));
      setIsLoading(false);
      setUser(null);
      setInitialized(true);
      return false;
    }
  }, [initialized]);

  // This effect runs once on component mount to initialize auth state
  useEffect(() => {
    let isMounted = true;
    
    async function initSession() {
      try {
        setIsLoading(true);
        
        // Perform the initial auth check
        await checkAuthState();
        
        // Subscribe to auth changes
        const unsubscribe = pb.authStore.onChange((token, model) => {
          if (!isMounted) return;
          
          console.log('[useSession] Auth state changed:', {
            hasToken: !!token,
            hasModel: !!model,
            isValid: pb.authStore.isValid,
            modelId: model?.id
          });
          
          if (token && model && pb.authStore.isValid) {
            setUser({
              id: model.id,
              email: model.email,
              name: model.name,
              username: model.username,
              avatar: model.avatar,
            });
            console.log('[useSession] User set from onChange:', model.id);
          } else {
            console.log('[useSession] User cleared in onChange');
            setUser(null);
          }
        });
        
        return () => {
          isMounted = false;
          console.log('[useSession] Cleanup - unsubscribing');
          unsubscribe();
        };
      } catch (err) {
        if (!isMounted) return;
        console.error('[useSession] Session initialization error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error initializing session'));
        setIsLoading(false);
        setUser(null);
      }
    }
    
    initSession();
  }, [checkAuthState]);

  // Force an immediate state update when in browser environment after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wait for initial page load then force a re-check in browser
      const timer = setTimeout(() => {
        if (!initialized) {
          console.log('[useSession] Forcing auth state check after hydration');
          checkAuthState();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [checkAuthState, initialized]);

  // This is where we need to be extremely careful with SSR vs. client differences
  // Get the actual isAuthenticated value directly from PocketBase for both consistency
  const isAuthenticated = initialized ? !!user : false;

  console.log('[useSession] Return values:', { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user, 
    initialized 
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    checkAuthState // Return the function to allow components to trigger a state check
  };
} 