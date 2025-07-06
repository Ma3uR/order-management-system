# React Hooks for Profile and User Management

This directory contains React hooks for managing user profiles and user administration features.

## useProfile Hook

The `useProfile` hook provides functionality for managing the current user's profile data with optimistic updates.

### Features

- ✅ Fetches user profile data from `/api/profile`
- ✅ Optimistic updates for immediate UI feedback
- ✅ Automatic rollback on errors
- ✅ Consistent loading/error state with `useSession`
- ✅ TypeScript support

### Usage

```tsx
import { useProfile } from '@/app/hooks';

function ProfileComponent() {
  const { profile, isLoading, error, updateProfile, refreshProfile } = useProfile();

  const handleUpdate = async () => {
    try {
      await updateProfile({ name: 'New Name', email: 'new@email.com' });
    } catch (error) {
      // Handle error - UI already rolled back
      console.error('Update failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>{profile?.email}</p>
      <p>Role: {profile?.role}</p>
      <button onClick={handleUpdate}>Update Profile</button>
    </div>
  );
}
```

### API

#### Return Values

- `profile: Profile | null` - Current user profile data
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `updateProfile(data: ProfileUpdateData): Promise<Profile>` - Update profile with optimistic updates
- `refreshProfile(): void` - Manually refresh profile data

#### Types

```typescript
interface Profile {
  id: string;
  name: string;
  email: string;
  role: UsersRoleOptions;
  plan: UsersPlanOptions;
  created: string;
  updated: string;
}

interface ProfileUpdateData {
  name?: string;
  email?: string;
}
```

## useUsers Hook

The `useUsers` hook provides functionality for managing users list and role assignments (admin only).

### Features

- ✅ Fetches users list from `/api/users` (admin only)
- ✅ Role management with optimistic updates via `setRole(userId, role)`
- ✅ Automatic permission checking
- ✅ Consistent loading/error state with `useSession`
- ✅ TypeScript support

### Usage

```tsx
import { useUsers } from '@/app/hooks';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';

function UsersManagement() {
  const { users, isLoading, error, setRole, hasAdminAccess } = useUsers();

  const handleRoleChange = async (userId: string, newRole: UsersRoleOptions) => {
    try {
      await setRole(userId, newRole);
    } catch (error) {
      // Handle error - UI already rolled back
      console.error('Role update failed:', error);
    }
  };

  if (!hasAdminAccess) {
    return <div>Admin access required</div>;
  }

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <span>{user.name} - {user.role}</span>
          <button onClick={() => handleRoleChange(user.id, UsersRoleOptions.admin)}>
            Make Admin
          </button>
        </div>
      ))}
    </div>
  );
}
```

### API

#### Return Values

- `users: User[]` - List of all users
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `setRole(userId: string, role: UsersRoleOptions): Promise<User>` - Update user role with optimistic updates
- `refreshUsers(): void` - Manually refresh users list
- `hasAdminAccess: boolean` - Whether current user has admin permissions

#### Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UsersRoleOptions;
  plan: UsersPlanOptions;
  created: string;
  updated: string;
}
```

## Optimistic Updates

Both hooks implement optimistic updates for better user experience:

1. **Immediate UI Update**: Changes are applied immediately to the UI
2. **API Call**: Request is sent to the server
3. **Success**: UI is updated with server response
4. **Error**: Changes are rolled back and error is thrown

This provides instant feedback while ensuring data consistency.

## Error Handling

All hooks provide consistent error handling:

- Network errors
- Authentication errors (401)
- Permission errors (403)
- Validation errors (400)
- Server errors (500)

Errors are automatically logged and exposed through the `error` property.

## Integration with useSession

Both hooks are designed to work seamlessly with the existing `useSession` hook:

- Consistent state management patterns
- Same loading/error state structure
- Automatic permission checking
- TypeScript compatibility

## API Dependencies

These hooks depend on the following API endpoints:

- `GET /api/profile` - Fetch current user profile
- `PUT /api/profile` - Update current user profile
- `GET /api/users` - Fetch users list (admin only)
- `PUT /api/users/[id]/role` - Update user role (admin only)

Make sure these endpoints are properly implemented and secured.
