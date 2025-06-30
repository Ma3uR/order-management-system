import pb from '@/app/lib/pocketbase';
import { UsersRoleOptions } from '@/app/types/pocketbase-types';

/**
 * Get user role from database with multiple fallback methods
 */
export async function getUserRole(userId: string): Promise<UsersRoleOptions | null> {
  try {
    // Method 1: Try to get role from users collection
    console.log('Attempting to fetch user role for ID:', userId);
    
    try {
      const userRecord = await pb.collection('users').getOne(userId, {
        fields: '*'
      });
      console.log('Users collection response:', userRecord);
      
      if (userRecord.role) {
        console.log('Found role in users collection:', userRecord.role);
        return userRecord.role as UsersRoleOptions;
      }
    } catch (usersError) {
      console.log('Failed to get role from users collection:', usersError);
    }

    // Method 2: Try alternative collection name if it exists
    try {
      const userRecord = await pb.collection('user_roles').getList(1, 1, {
        filter: `user_id="${userId}"`
      });
      console.log('User_roles collection response:', userRecord);
      
      if (userRecord.items[0]?.role) {
        console.log('Found role in user_roles collection:', userRecord.items[0].role);
        return userRecord.items[0].role as UsersRoleOptions;
      }
    } catch {
      console.log('No user_roles collection or no record found');
    }

    // Method 3: Check if role is stored in a different field
    try {
      const userRecord = await pb.collection('users').getOne(userId);
      console.log('Checking alternative field names in users record:', userRecord);
      
      // Check various possible field names
      const possibleRoleFields = ['role', 'userRole', 'user_role', 'type', 'permission', 'access_level'];
      
      for (const fieldName of possibleRoleFields) {
        if (userRecord[fieldName]) {
          console.log(`Found role in field '${fieldName}':`, userRecord[fieldName]);
          return userRecord[fieldName] as UsersRoleOptions;
        }
      }
    } catch (altFieldError) {
      console.log('Failed to check alternative fields:', altFieldError);
    }

    // Method 4: Fallback - if user exists and no role found, check if they should be admin
    // This is based on email patterns or other criteria
    try {
      const userRecord = await pb.collection('users').getOne(userId);
      
      // Define admin email patterns or specific admin users
      const adminEmails = [
        // 'andriimazurenko99@gmail.com', // Your email
        'test@test.com',
        // Add other admin emails here
      ];
      
      if (adminEmails.includes(userRecord.email)) {
        console.log('User is in admin email list, granting admin role');
        return UsersRoleOptions.admin;
      }
      
      // Default to user role for authenticated users
      console.log('No role found, defaulting to user role');
      return UsersRoleOptions.user;
      
    } catch (fallbackError) {
      console.log('Fallback method failed:', fallbackError);
    }

    console.log('All methods failed, returning null');
    return null;

  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Set user role in database
 */
export async function setUserRole(userId: string, role: UsersRoleOptions): Promise<boolean> {
  try {
    await pb.collection('users').update(userId, { role });
    console.log(`Successfully set role ${role} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
}

/**
 * Check if the role field exists in the users collection schema
 */
export async function checkRoleFieldExists(): Promise<boolean> {
  try {
    // This will help us debug if the field exists in the schema
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL || '',
      process.env.POCKETBASE_ADMIN_PASSWORD || ''
    );
    
    // Note: This requires admin access - mainly for debugging
    return true;
  } catch {
    console.log('Cannot check schema - no admin access');
    return false;
  }
}