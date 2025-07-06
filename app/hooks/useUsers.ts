'use client';

import { useState, useEffect, useCallback } from 'react';
import { UsersRoleOptions, UsersPlanOptions, UsersResponse } from '@/app/types/pocketbase-types';
import { useSession } from './useSession';
import { hasPermission, PERMISSIONS } from '@/app/lib/auth/permissions';
import { getAllUsers, updateUserRole } from '@/app/[locale]/profile/actions/profile';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UsersRoleOptions;
  plan: UsersPlanOptions;
  created: string;
  updated: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user: currentUser } = useSession();

  // Check if current user has admin permissions
  const hasAdminAccess = currentUser && hasPermission(currentUser.role as UsersRoleOptions, PERMISSIONS.USERS_VIEW);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    if (!hasAdminAccess) {
      setError(new Error('Admin access required'));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getAllUsers();
      
      console.log('🔍 [useUsers] getAllUsers result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.data) {
        console.log('📊 [useUsers] Raw user data received:', result.data.length, 'users');
        result.data.forEach((user, index) => {
          console.log(`  ${index + 1}. RAW USER DATA:`, {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            plan: user.plan,
            emailType: typeof user.email,
            nameType: typeof user.name
          });
        });
        
        // Convert UsersResponse to User interface
        const convertedUsers: User[] = result.data.map((user: UsersResponse) => ({
          id: user.id,
          name: user.username || user.name || 'Unknown User', // Use username first, then name
          email: user.email || `${user.username || user.id}@local`, // Use username as email fallback
          role: user.role || UsersRoleOptions.user,
          plan: user.plan || UsersPlanOptions.free,
          created: user.created || '',
          updated: user.updated || '',
        }));
        
        console.log('📊 [useUsers] Converted users for UI:', convertedUsers.length);
        setUsers(convertedUsers);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasAdminAccess]);

  // Set user role with optimistic updates
  const setRole = useCallback(async (userId: string, newRole: UsersRoleOptions) => {
    if (!hasAdminAccess) {
      throw new Error('Admin access required');
    }

    if (!currentUser || !hasPermission(currentUser.role as UsersRoleOptions, PERMISSIONS.USERS_ROLE_MANAGE)) {
      throw new Error('Insufficient permissions to manage user roles');
    }

    // Find the user to update
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) {
      throw new Error('User not found');
    }

    // Store original users for rollback
    const originalUsers = users;
    
    try {
      // Optimistic update - immediately update the UI
      const optimisticUsers = users.map(user => 
        user.id === userId 
          ? { ...user, role: newRole, updated: new Date().toISOString() }
          : user
      );
      setUsers(optimisticUsers);

      // Call server action
      const result = await updateUserRole(userId, newRole);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // If successful, the optimistic update is already in place
      return userToUpdate;
    } catch (err) {
      // Rollback optimistic update on error
      setUsers(originalUsers);
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('Error updating user role:', error);
      throw error;
    }
  }, [users, hasAdminAccess, currentUser]);

  // Refresh users list
  const refreshUsers = useCallback(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load users on mount and when admin access changes
  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers();
    } else {
      setUsers([]);
      setError(hasAdminAccess === false ? new Error('Admin access required') : null);
      setIsLoading(false);
    }
  }, [fetchUsers, hasAdminAccess]);

  return {
    users,
    isLoading,
    error,
    setRole,
    refreshUsers,
    hasAdminAccess,
  };
}
