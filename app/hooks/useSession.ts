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

  useEffect(() => {
    try {
      // Get the current authenticated user from PocketBase
      const authModel = pb.authStore.model;
      
      if (authModel) {
        setUser({
          id: authModel.id,
          email: authModel.email,
          name: authModel.name,
          username: authModel.username,
          avatar: authModel.avatar,
        });
      } else {
        setUser(null);
      }
      
      // Subscribe to authentication changes
      const unsubscribe = pb.authStore.onChange(() => {
        const currentModel = pb.authStore.model;
        if (currentModel) {
          setUser({
            id: currentModel.id,
            email: currentModel.email,
            name: currentModel.name,
            username: currentModel.username,
            avatar: currentModel.avatar,
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
      console.error('Session error:', err);
      setError(err instanceof Error ? err : new Error('Unknown session error'));
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
} 