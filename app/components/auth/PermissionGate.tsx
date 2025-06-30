'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/app/hooks/usePermissions';
import { Permission } from '@/app/lib/auth/permissions';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';

interface PermissionGateProps {
  /**
   * Content to render if user has permission
   */
  children: ReactNode;
  
  /**
   * Required permission to show content
   */
  permission?: Permission;
  
  /**
   * Required permissions (user must have ANY of these)
   */
  anyPermissions?: Permission[];
  
  /**
   * Required permissions (user must have ALL of these)
   */
  allPermissions?: Permission[];
  
  /**
   * Required role
   */
  role?: UsersRoleOptions;
  
  /**
   * Admin only access
   */
  adminOnly?: boolean;
  
  /**
   * Content to render if user doesn't have permission
   */
  fallback?: ReactNode;
  
  /**
   * Custom check function
   */
  customCheck?: (userRole: UsersRoleOptions | null) => boolean;
  
  /**
   * Invert the permission check (show when user DOESN'T have permission)
   */
  invert?: boolean;
}

/**
 * Component that conditionally renders content based on user permissions
 */
export function PermissionGate({
  children,
  permission,
  anyPermissions,
  allPermissions,
  role,
  adminOnly = false,
  fallback = null,
  customCheck,
  invert = false,
}: PermissionGateProps) {
  const { 
    userRole, 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isAdmin,
    isAuthenticated 
  } = usePermissions();

  // If user is not authenticated, don't show anything
  if (!isAuthenticated) {
    return <>{invert ? children : fallback}</>;
  }

  let hasAccess = false;

  // If adminOnly is true and user is admin, grant access immediately
  if (adminOnly && isAdmin) {
    hasAccess = true;
  }
  // Otherwise, check other conditions
  else {
    // Start with true if no specific conditions are set
    hasAccess = true;

    // Check specific role (must match exactly)
    if (role && userRole !== role) {
      hasAccess = false;
    }

    // Check single permission
    if (permission && !hasPermission(permission)) {
      hasAccess = false;
    }

    // Check any permissions (user must have at least one)
    if (anyPermissions && !hasAnyPermission(anyPermissions)) {
      hasAccess = false;
    }

    // Check all permissions (user must have all of them)
    if (allPermissions && !hasAllPermissions(allPermissions)) {
      hasAccess = false;
    }

    // Check custom function
    if (customCheck && !customCheck(userRole)) {
      hasAccess = false;
    }

    // If adminOnly is true but user is not admin, deny access
    if (adminOnly && !isAdmin) {
      hasAccess = false;
    }
  }

  // Apply invert logic
  const shouldShow = invert ? !hasAccess : hasAccess;

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    const conditions = {
      adminOnly,
      permission,
      anyPermissions,
      allPermissions,
      role,
      userRole,
      isAdmin,
      isAuthenticated,
      hasAccess,
      shouldShow
    };
    
    if (!shouldShow && (adminOnly || permission)) {
      console.log('🚫 PermissionGate: Access denied', conditions);
    }
  }

  return <>{shouldShow ? children : fallback}</>;
}

/**
 * Simplified admin-only gate
 */
interface AdminGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminGate({ children, fallback = null }: AdminGateProps) {
  return (
    <PermissionGate adminOnly fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Show content only for regular users (not admins)
 */
export function UserOnlyGate({ children, fallback = null }: AdminGateProps) {
  return (
    <PermissionGate role={UsersRoleOptions.user} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Wrapper for content that should be hidden from certain roles
 */
interface HideFromRoleProps {
  children: ReactNode;
  role: UsersRoleOptions;
  fallback?: ReactNode;
}

export function HideFromRole({ children, role, fallback = null }: HideFromRoleProps) {
  return (
    <PermissionGate 
      invert 
      role={role} 
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}