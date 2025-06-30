'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/app/hooks/useSession';
import { canAccessRoute, hasPermission, isAdmin } from '@/app/lib/auth/permissions';
import { Permission } from '@/app/lib/auth/permissions';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required permission to access this route
   */
  requiredPermission?: Permission;
  /**
   * Required role to access this route
   */
  requiredRole?: UsersRoleOptions;
  /**
   * Admin only access
   */
  adminOnly?: boolean;
  /**
   * Redirect path if access is denied
   */
  fallbackPath?: string;
  /**
   * Custom access check function
   */
  customCheck?: (userRole: UsersRoleOptions | null) => boolean;
  /**
   * Show loading spinner while checking permissions
   */
  showLoading?: boolean;
}

export function ProtectedRoute({
  children,
  requiredPermission,
  requiredRole,
  adminOnly = false,
  fallbackPath = '/dashboard',
  customCheck,
  showLoading = true,
}: ProtectedRouteProps) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    setIsChecking(true);

    // If no user, redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    const userRole = user.role as UsersRoleOptions;

    // Check admin-only access
    if (adminOnly && !isAdmin(userRole)) {
      console.warn('Access denied: Admin only route');
      router.push(fallbackPath);
      return;
    }

    // Check required role
    if (requiredRole && userRole !== requiredRole) {
      console.warn(`Access denied: Required role ${requiredRole}, user has ${userRole}`);
      router.push(fallbackPath);
      return;
    }

    // Check required permission
    if (requiredPermission && !hasPermission(userRole, requiredPermission)) {
      console.warn(`Access denied: Missing permission ${requiredPermission}`);
      router.push(fallbackPath);
      return;
    }

    // Check custom access function
    if (customCheck && !customCheck(userRole)) {
      console.warn('Access denied: Custom check failed');
      router.push(fallbackPath);
      return;
    }

    // All checks passed
    setIsChecking(false);
  }, [user, isLoading, router, requiredPermission, requiredRole, adminOnly, fallbackPath, customCheck]);

  // Show loading spinner while checking authentication or permissions
  if (isLoading || isChecking) {
    if (!showLoading) return null;
    
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Checking permissions...
          </p>
        </div>
      </div>
    );
  }

  // If we get here, user has access
  return <>{children}</>;
}

interface RouteGuardProps {
  children: React.ReactNode;
  route: string;
  fallbackPath?: string;
}

/**
 * Simplified route guard that checks permissions based on route configuration
 */
export function RouteGuard({ children, route, fallbackPath = '/dashboard' }: RouteGuardProps) {
  const { user } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const userRole = user.role as UsersRoleOptions;
    
    if (!canAccessRoute(userRole, route)) {
      console.warn(`Access denied to route: ${route}`);
      router.push(fallbackPath);
      return;
    }
  }, [user, route, router, fallbackPath]);

  if (!user) return null;

  const userRole = user.role as UsersRoleOptions;
  
  if (!canAccessRoute(userRole, route)) {
    return null;
  }

  return <>{children}</>;
}