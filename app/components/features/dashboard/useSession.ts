'use client';

import { useState, useEffect } from 'react';
import pb, { getCurrentUser, isAuthenticated } from '@/app/lib/pocketbase';

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
      const authModel = getCurrentUser();
      
      // Log auth details
      console.log('PocketBase auth state in useSession:', {
        isValid: isAuthenticated(),
        token: pb.authStore.token ? `${pb.authStore.token.substring(0, 10)}...` : null,
        modelId: authModel?.id || null,
        modelType: authModel?.type || null
      });
      
      if (authModel) {
        console.log(`Found authenticated user in useSession: ${authModel.id} (${typeof authModel.id})`);
        
        // Create a standardized user object
        setUser({
          id: authModel.id,
          email: authModel.email,
          name: authModel.name,
          username: authModel.username,
          avatar: authModel.avatar,
        });
      } else {
        console.log('No authenticated user found in useSession');
        setUser(null);
      }
      
      // Subscribe to authentication changes
      const unsubscribe = pb.authStore.onChange(() => {
        const currentModel = pb.authStore.model;
        console.log('Auth state changed in useSession:', {
          isValid: pb.authStore.isValid,
          hasModel: !!currentModel,
          modelId: currentModel?.id || null
        });
        
        if (currentModel) {
          console.log(`Auth change in useSession: user ID is now ${currentModel.id} (${typeof currentModel.id})`);
          setUser({
            id: currentModel.id,
            email: currentModel.email,
            name: currentModel.name,
            username: currentModel.username,
            avatar: currentModel.avatar,
          });
        } else {
          console.log('Auth change in useSession: no user authenticated');
          setUser(null);
        }
      });
      
      setIsLoading(false);
      
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Session error in useSession:', err);
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