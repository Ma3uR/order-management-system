import { UsersRoleOptions } from '@/app/types/pocketbase-types';

// Define all permissions in the system
export const PERMISSIONS = {
  // Order management permissions
  ORDERS_VIEW: 'orders:view',
  ORDERS_CREATE: 'orders:create',
  ORDERS_EDIT: 'orders:edit',
  ORDERS_DELETE: 'orders:delete',
  
  // Expense management permissions (admin only)
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_EDIT: 'expenses:edit',
  EXPENSES_DELETE: 'expenses:delete',
  
  // Fiscal management permissions (chatbot/admin)
  FISCAL_VIEW: 'fiscal:view',
  FISCAL_MANAGE: 'fiscal:manage',
  FISCAL_REPORTS: 'fiscal:reports',
  
  // User management permissions (admin only)
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  // Settings permissions
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
  
  // Reports and analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  
  // Blacklist management
  BLACKLIST_VIEW: 'blacklist:view',
  BLACKLIST_MANAGE: 'blacklist:manage',
  
  // Salary calculations
  SALARY_VIEW: 'salary:view',
  SALARY_CALCULATE: 'salary:calculate',
} as const;

// Type for permission values
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Define role-to-permission mapping
export const ROLE_PERMISSIONS: Record<UsersRoleOptions, Permission[]> = {
  [UsersRoleOptions.admin]: [
    // Admins have access to everything
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_EDIT,
    PERMISSIONS.EXPENSES_DELETE,
    PERMISSIONS.FISCAL_VIEW,
    PERMISSIONS.FISCAL_MANAGE,
    PERMISSIONS.FISCAL_REPORTS,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.BLACKLIST_VIEW,
    PERMISSIONS.BLACKLIST_MANAGE,
    PERMISSIONS.SALARY_VIEW,
    PERMISSIONS.SALARY_CALCULATE,
  ],
  [UsersRoleOptions.user]: [
    // Regular users have limited access
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.BLACKLIST_VIEW,
    PERMISSIONS.SALARY_VIEW,
    PERMISSIONS.SALARY_CALCULATE,
  ],
};

// Special role for chatbot/automation (can use fiscal tools)
export const CHATBOT_PERMISSIONS: Permission[] = [
  PERMISSIONS.FISCAL_VIEW,
  PERMISSIONS.FISCAL_MANAGE,
  PERMISSIONS.FISCAL_REPORTS,
  PERMISSIONS.ORDERS_VIEW,
  PERMISSIONS.ORDERS_EDIT,
];

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(userRole: UsersRoleOptions | null, permission: Permission): boolean {
  if (!userRole) {
    return false;
  }
  
  // Convert string to enum if needed - handle both string and enum values
  let normalizedRole: UsersRoleOptions;
  if (typeof userRole === 'string') {
    if (userRole === 'admin') {
      normalizedRole = UsersRoleOptions.admin;
    } else if (userRole === 'user') {
      normalizedRole = UsersRoleOptions.user;
    } else {
      console.log('hasPermission: Unknown role string:', userRole);
      return false;
    }
  } else {
    normalizedRole = userRole;
  }
  
  const rolePermissions = ROLE_PERMISSIONS[normalizedRole];
  
  if (!rolePermissions) {
    return false;
  }
  
  return rolePermissions.includes(permission);
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(userRole: UsersRoleOptions | null, permissions: Permission[]): boolean {
  if (!userRole) return false;
  
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(userRole: UsersRoleOptions | null, permissions: Permission[]): boolean {
  if (!userRole) return false;
  
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(userRole: UsersRoleOptions): Permission[] {
  return ROLE_PERMISSIONS[userRole] || [];
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UsersRoleOptions | null): boolean {
  if (!userRole) {
    return false;
  }
  
  // Handle both string and enum values
  if (typeof userRole === 'string') {
    return userRole === 'admin';
  }
  
  return userRole === UsersRoleOptions.admin;
}

/**
 * Check if user is regular user
 */
export function isUser(userRole: UsersRoleOptions | null): boolean {
  return userRole === UsersRoleOptions.user;
}

/**
 * Route configurations with required permissions
 */
export const ROUTE_PERMISSIONS = {
  '/dashboard': [PERMISSIONS.ORDERS_VIEW],
  '/dashboard/orders': [PERMISSIONS.ORDERS_VIEW],
  '/dashboard/expenses': [PERMISSIONS.EXPENSES_VIEW],
  '/dashboard/settings': [PERMISSIONS.SETTINGS_VIEW],
  '/dashboard/blacklist': [PERMISSIONS.BLACKLIST_VIEW],
  '/dashboard/reports': [PERMISSIONS.REPORTS_VIEW],
};

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(userRole: UsersRoleOptions | null, route: string): boolean {
  const requiredPermissions = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
  
  if (!requiredPermissions) {
    // If route is not defined in permissions, allow access
    return true;
  }
  
  return hasAnyPermission(userRole, requiredPermissions);
}