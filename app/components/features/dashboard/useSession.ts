'use client';

import { useState, useEffect } from 'react';
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

  // This effect runs once on component mount to initialize auth state
  useEffect(() => {
    async function initSession() {
      try {
        setIsLoading(true);
        
        // If we have a valid auth, use it
        if (pb.authStore.isValid && pb.authStore.model) {
          setUser({
            id: pb.authStore.model.id,
            email: pb.authStore.model.email,
            name: pb.authStore.model.name,
            username: pb.authStore.model.username,
            avatar: pb.authStore.model.avatar,
          });
        } else {
          // No valid auth, try to refresh it
          try {
            if (pb.authStore.token) {
              // Try to refresh token if we have one
              await pb.collection('users').authRefresh();
              
              if (pb.authStore.isValid && pb.authStore.model) {
                setUser({
                  id: pb.authStore.model.id,
                  email: pb.authStore.model.email,
                  name: pb.authStore.model.name,
                  username: pb.authStore.model.username,
                  avatar: pb.authStore.model.avatar,
                });
                console.log('Set user after auth refresh:', pb.authStore.model.id);
              } else {
                console.log('Auth refresh completed but still not valid');
                setUser(null);
              }
            } else {
              console.log('No token to refresh');
              setUser(null);
            }
          } catch (refreshError) {
            console.error('Failed to refresh auth:', refreshError);
            pb.authStore.clear();
            setUser(null);
          }
        }
        
        // Subscribe to auth changes
        const unsubscribe = pb.authStore.onChange((token, model) => {
          console.log('Auth state changed:', {
            hasToken: !!token,
            hasModel: !!model,
            isValid: pb.authStore.isValid
          });
          
          if (token && model && pb.authStore.isValid) {
            setUser({
              id: model.id,
              email: model.email,
              name: model.name,
              username: model.username,
              avatar: model.avatar,
            });
          } else {
            setUser(null);
          }
        });
        
        setIsLoading(false);
        return () => {
          unsubscribe();
        };
      } catch (err) {
        console.error('Session initialization error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error initializing session'));
        setIsLoading(false);
        setUser(null);
      }
    }
    
    initSession();
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
} 