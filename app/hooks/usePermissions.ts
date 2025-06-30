'use client';

import { useMemo } from 'react';
import { useSession } from '@/app/hooks/useSession';
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  getRolePermissions,
  isAdmin,
  isUser,
  canAccessRoute,
  Permission 
} from '@/app/lib/auth/permissions';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';

export interface UsePermissionsReturn {
  /**
   * Current user's role
   */
  userRole: UsersRoleOptions | null;
  
  /**
   * All permissions for the current user
   */
  permissions: Permission[];
  
  /**
   * Check if user has a specific permission
   */
  hasPermission: (permission: Permission) => boolean;
  
  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission: (permissions: Permission[]) => boolean;
  
  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  /**
   * Check if user can access a specific route
   */
  canAccessRoute: (route: string) => boolean;
  
  /**
   * Check if user is admin
   */
  isAdmin: boolean;
  
  /**
   * Check if user is regular user
   */
  isUser: boolean;
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * Loading state
   */
  isLoading: boolean;
}

/**
 * Hook for managing user permissions and role-based access control
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, isLoading } = useSession();

  const userRole = useMemo(() => {
    return user?.role as UsersRoleOptions | null;
  }, [user]);

  const permissions = useMemo(() => {
    if (!userRole) return [];
    return getRolePermissions(userRole);
  }, [userRole]);

  const checkPermission = useMemo(() => {
    return (permission: Permission) => hasPermission(userRole, permission);
  }, [userRole]);

  const checkAnyPermission = useMemo(() => {
    return (perms: Permission[]) => hasAnyPermission(userRole, perms);
  }, [userRole]);

  const checkAllPermissions = useMemo(() => {
    return (perms: Permission[]) => hasAllPermissions(userRole, perms);
  }, [userRole]);

  const checkRouteAccess = useMemo(() => {
    return (route: string) => canAccessRoute(userRole, route);
  }, [userRole]);

  return {
    userRole,
    permissions,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
    canAccessRoute: checkRouteAccess,
    isAdmin: isAdmin(userRole),
    isUser: isUser(userRole),
    isAuthenticated: !!user,
    isLoading,
  };
}

/**
 * Simplified hook that just checks for a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook that checks for admin role
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions();
  return isAdmin;
}

/**
 * Hook that checks for multiple permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = usePermissions();
  return hasAnyPermission(permissions);
}

/**
 * Hook that checks route access
 */
export function useCanAccessRoute(route: string): boolean {
  const { canAccessRoute } = usePermissions();
  return canAccessRoute(route);
}