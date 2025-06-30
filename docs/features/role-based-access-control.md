# Role-Based Access Control (RBAC) System

## Overview

The application implements a comprehensive role-based access control system that restricts access to features and pages based on user roles and permissions.

## User Roles

The system supports two main user roles:

### Admin Role (`admin`)
- **Full system access** - Can access all features and pages
- **User management** - Can manage other users
- **Financial tools** - Access to expenses and fiscal management
- **System settings** - Can modify system configurations

### User Role (`user`)
- **Order management** - Can view, create, and edit orders
- **Basic reporting** - Can view reports and analytics
- **Blacklist access** - Can view blacklist entries
- **Salary calculations** - Can calculate salaries
- **Limited settings** - Can view basic settings

## Permission System

### Core Permissions

#### Order Management
- `orders:view` - View orders
- `orders:create` - Create new orders
- `orders:edit` - Edit existing orders
- `orders:delete` - Delete orders (admin only)

#### Financial Management (Admin Only)
- `expenses:view` - View expenses
- `expenses:create` - Create expenses
- `expenses:edit` - Edit expenses
- `expenses:delete` - Delete expenses

#### Fiscal Management (Admin/Chatbot Only)
- `fiscal:view` - View fiscal receipts
- `fiscal:manage` - Create fiscal receipts
- `fiscal:reports` - Access fiscal reports

#### System Management (Admin Only)
- `users:view` - View users
- `users:create` - Create users
- `users:edit` - Edit users
- `users:delete` - Delete users
- `settings:manage` - Manage system settings

## Implementation Components

### 1. Permission Utilities (`/app/lib/auth/permissions.ts`)
```typescript
import { hasPermission, isAdmin, PERMISSIONS } from '@/app/lib/auth/permissions';

// Check if user has permission
const canManageExpenses = hasPermission(userRole, PERMISSIONS.EXPENSES_VIEW);

// Check if user is admin
const isUserAdmin = isAdmin(userRole);
```

### 2. usePermissions Hook (`/app/hooks/usePermissions.ts`)
```typescript
import { usePermissions } from '@/app/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, isAdmin, userRole } = usePermissions();
  
  const canViewExpenses = hasPermission(PERMISSIONS.EXPENSES_VIEW);
  
  // Component logic...
}
```

### 3. ProtectedRoute Component (`/app/components/auth/ProtectedRoute.tsx`)
```typescript
import { ProtectedRoute } from '@/app/components/auth/ProtectedRoute';

function ExpensesPage() {
  return (
    <ProtectedRoute adminOnly fallbackPath="/dashboard">
      {/* Admin-only content */}
    </ProtectedRoute>
  );
}
```

### 4. PermissionGate Component (`/app/components/auth/PermissionGate.tsx`)
```typescript
import { PermissionGate } from '@/app/components/auth/PermissionGate';

function OrderDetails() {
  return (
    <div>
      <PermissionGate permission={PERMISSIONS.FISCAL_MANAGE}>
        <FiscalReceiptSection />
      </PermissionGate>
    </div>
  );
}
```

## Protected Areas

### 1. Expenses Page
- **Access**: Admin only
- **Protection**: `ProtectedRoute` with `adminOnly` prop
- **Visual indicator**: Shield icon and "Admin Only" label

### 2. Fiscal Tools
- **Access**: Admin only (fiscal management permission)
- **Protection**: `PermissionGate` with `PERMISSIONS.FISCAL_MANAGE`
- **Location**: Order details modal fiscal receipt section

### 3. Navigation Menu
- **Dynamic rendering**: Menu items show/hide based on permissions
- **Expenses & Fiscal**: Only visible to admins
- **Other items**: Visible based on specific permissions

## Route Protection

### Protected Routes Configuration
```typescript
export const ROUTE_PERMISSIONS = {
  '/dashboard': [PERMISSIONS.ORDERS_VIEW],
  '/dashboard/orders': [PERMISSIONS.ORDERS_VIEW],
  '/dashboard/expenses': [PERMISSIONS.EXPENSES_VIEW],
  '/dashboard/settings': [PERMISSIONS.SETTINGS_VIEW],
  '/dashboard/blacklist': [PERMISSIONS.BLACKLIST_VIEW],
  '/dashboard/reports': [PERMISSIONS.REPORTS_VIEW],
};
```

### Usage Example
```typescript
// Check if user can access a route
const canAccess = canAccessRoute(userRole, '/dashboard/expenses');
```

## Best Practices

### 1. Always Use Permission Gates
```typescript
// ✅ Good - Protected with permission gate
<PermissionGate permission={PERMISSIONS.EXPENSES_VIEW}>
  <ExpenseButton />
</PermissionGate>

// ❌ Bad - No protection
<ExpenseButton />
```

### 2. Combine Multiple Protection Layers
```typescript
// Page-level protection
<ProtectedRoute adminOnly>
  <div>
    {/* Component-level protection */}
    <PermissionGate permission={PERMISSIONS.EXPENSES_CREATE}>
      <CreateExpenseButton />
    </PermissionGate>
  </div>
</ProtectedRoute>
```

### 3. Provide Fallback Content
```typescript
<PermissionGate 
  permission={PERMISSIONS.FISCAL_MANAGE}
  fallback={<div>Access restricted to administrators</div>}
>
  <FiscalTools />
</PermissionGate>
```

### 4. Use Semantic Permissions
```typescript
// ✅ Good - Semantic permission names
PERMISSIONS.ORDERS_VIEW
PERMISSIONS.EXPENSES_CREATE

// ❌ Bad - Generic or unclear names
PERMISSIONS.READ
PERMISSIONS.ADMIN_STUFF
```

## Testing Access Control

### 1. Test Different User Roles
- Create test users with different roles
- Verify navigation visibility
- Test page access restrictions
- Confirm component-level hiding

### 2. Test Edge Cases
- Unauthenticated users
- Users with no permissions
- Invalid role transitions
- API endpoint protection

## Security Considerations

### 1. Client-Side Protection Only
- Current implementation is **client-side only**
- Server-side validation should be added for production
- API endpoints should verify permissions

### 2. Role Changes
- Users must re-authenticate after role changes
- Consider implementing real-time role updates

### 3. Permission Caching
- Permissions are computed on each render
- Consider caching for performance in large applications

## Future Enhancements

### 1. Server-Side Protection
- Add middleware-level route protection
- Implement API endpoint permission checking
- Add database-level access controls

### 2. Dynamic Permissions
- Support for custom permission assignment
- Role hierarchy system
- Temporary permission grants

### 3. Audit Logging
- Track permission checks
- Log access attempts
- Monitor unauthorized access

## Migration Guide

If upgrading from a system without RBAC:

1. **Update User Database Schema**
   - Ensure users have a `role` field
   - Set default roles for existing users

2. **Wrap Protected Components**
   - Identify components that need protection
   - Add appropriate `PermissionGate` wrappers

3. **Update Navigation**
   - Modify navigation components to use permission checking
   - Test with different user roles

4. **Add Route Protection**
   - Wrap page components with `ProtectedRoute`
   - Define route permission requirements

5. **Test Thoroughly**
   - Verify all protected areas work correctly
   - Test with different user roles
   - Ensure fallback behavior works