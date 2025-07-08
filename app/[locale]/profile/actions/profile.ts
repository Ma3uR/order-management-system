"use server";

import pb, { authenticatedCall } from "@/app/lib/pocketbase";
import { getUserRole } from "@/app/lib/auth/user-roles";
import { UsersResponse, UsersRoleOptions, UsersPlanOptions } from "@/app/types/pocketbase-types";
import { z } from "zod";
import { cookies } from "next/headers";
import { loadAuthFromCookies } from '@/app/lib/utils/auth.server';

// Validation schemas
const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email format").max(200, "Email is too long"),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UsersRoleOptions;
  plan: UsersPlanOptions;
  created: string;
  updated: string;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<{ error?: string; data?: Profile }> {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('pb_auth');
    
    await loadAuthFromCookies();
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      console.log('🔍 [getProfile] Auth failure - Cookie present:', !!authCookie?.value, 'AuthStore valid:', pb.authStore.isValid, 'Model ID:', pb.authStore.model?.id);
      return { error: 'Not authenticated – please log in again.' };
    }

    const userId = pb.authStore.model.id;
    console.log('🔍 [getProfile] Fetching profile for user:', userId);

    // Get user data from the users collection
    const user = await authenticatedCall(() => 
      pb.collection('users').getOne<UsersResponse>(userId)
    );

    // Get user role
    const role = await getUserRole(userId);
    if (!role) {
      return { error: "Could not determine user role" };
    }

    const profile: Profile = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      role: role,
      plan: user.plan || UsersPlanOptions.free,
      created: user.created,
      updated: user.updated,
    };

    console.log('✅ [getProfile] Profile fetched successfully:', { 
      id: profile.id, 
      email: profile.email, 
      role: profile.role 
    });

    return { data: profile };
  } catch (error) {
    console.error('❌ [getProfile] Error:', error);
    return { 
      error: error instanceof Error ? error.message : "Failed to fetch profile" 
    };
  }
}

/**
 * Update current user's profile
 */
export async function updateProfile(data: ProfileUpdateData): Promise<{ error?: string; data?: Profile }> {
  try {
    // Validate input data
    const validatedData = profileUpdateSchema.parse(data);

    const cookieStore = cookies();
    const authCookie = cookieStore.get('pb_auth');
    
    await loadAuthFromCookies();
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      console.log('🔍 [updateProfile] Auth failure - Cookie present:', !!authCookie?.value, 'AuthStore valid:', pb.authStore.isValid, 'Model ID:', pb.authStore.model?.id);
      return { error: 'Not authenticated – please log in again.' };
    }

    const userId = pb.authStore.model.id;
    console.log('🔍 [updateProfile] Updating profile for user:', userId);

    // Update user in database
    const updatedUser = await authenticatedCall(() =>
      pb.collection('users').update<UsersResponse>(userId, {
        name: validatedData.name.trim(),
        email: validatedData.email.trim(),
      })
    );

    // Get current role
    const role = await getUserRole(userId);
    if (!role) {
      return { error: "Could not determine user role" };
    }

    const profile: Profile = {
      id: updatedUser.id,
      name: updatedUser.name || updatedUser.email,
      email: updatedUser.email,
      role: role,
      plan: updatedUser.plan || UsersPlanOptions.free,
      created: updatedUser.created,
      updated: updatedUser.updated,
    };

    console.log('✅ [updateProfile] Profile updated successfully:', { 
      id: profile.id, 
      email: profile.email 
    });

    return { data: profile };
  } catch (error) {
    console.error('❌ [updateProfile] Error:', error);
    
    if (error instanceof z.ZodError) {
      return { error: error.errors[0]?.message || "Invalid input data" };
    }
    
    return { 
      error: error instanceof Error ? error.message : "Failed to update profile" 
    };
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  targetUserId: string, 
  newRole: UsersRoleOptions
): Promise<{ error?: string; data?: boolean }> {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('pb_auth');
    
    await loadAuthFromCookies();
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      console.log('🔍 [updateUserRole] Auth failure - Cookie present:', !!authCookie?.value, 'AuthStore valid:', pb.authStore.isValid, 'Model ID:', pb.authStore.model?.id);
      return { error: 'Not authenticated – please log in again.' };
    }

    const currentUserId = pb.authStore.model.id;
    const currentUserRole = await getUserRole(currentUserId);

    // Check if current user is admin
    if (currentUserRole !== UsersRoleOptions.admin) {
      return { error: "Insufficient permissions" };
    }

    // Prevent admin from changing their own role
    if (currentUserId === targetUserId) {
      return { error: "Cannot change your own role" };
    }

    console.log('🔍 [updateUserRole] Updating role for user:', targetUserId, 'to:', newRole);

    // Check if the target user is an admin (by trying to find them in admins collection)
    let isTargetAdmin = false;
    try {
      await authenticatedCall(() => pb.admins.getOne(targetUserId));
      isTargetAdmin = true;
    } catch {
      // User is not an admin, continue with regular user update
      isTargetAdmin = false;
    }

    if (isTargetAdmin) {
      return { error: "Cannot change admin user roles. Admin roles are managed at the system level." };
    }

    // Update regular user role
    await authenticatedCall(() =>
      pb.collection('users').update(targetUserId, { role: newRole })
    );

    console.log('✅ [updateUserRole] Role updated successfully');
    return { data: true };
  } catch (error) {
    console.error('❌ [updateUserRole] Error:', error);
    return { 
      error: error instanceof Error ? error.message : "Failed to update user role" 
    };
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<{ error?: string; data?: UsersResponse[] }> {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('pb_auth');
    
    await loadAuthFromCookies();
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      console.log('🔍 [getAllUsers] Auth failure - Cookie present:', !!authCookie?.value, 'AuthStore valid:', pb.authStore.isValid, 'Model ID:', pb.authStore.model?.id);
      return { error: 'Not authenticated – please log in again.' };
    }

    const currentUserId = pb.authStore.model.id;
    const currentUserRole = await getUserRole(currentUserId);

    // Check if current user is admin
    if (currentUserRole !== UsersRoleOptions.admin) {
      return { error: "Insufficient permissions" };
    }

    console.log('🔍 [getAllUsers] Fetching all users (both regular users and admins)');
    console.log('🔍 [getAllUsers] Current user ID:', currentUserId, 'Role:', currentUserRole);

    // Get regular users from the users collection
    console.log('🔍 [getAllUsers] Attempting to fetch users collection...');
    
    // First, let's check the total count
    const userCount = await authenticatedCall(() =>
      pb.collection('users').getList(1, 1)
    );
    console.log('📊 [getAllUsers] Users collection has', userCount.totalItems, 'total items');
    
    const regularUsers = await authenticatedCall(() =>
      pb.collection('users').getFullList<UsersResponse>({
        sort: '-created',
      })
    );
    
    console.log('📊 [getAllUsers] Retrieved', regularUsers.length, 'users from getFullList');
    console.log('🔍 [getAllUsers] Sample of data structure:', regularUsers.length > 0 ? {
      id: regularUsers[0].id,
      email: regularUsers[0].email,
      collectionId: regularUsers[0].collectionId,
      collectionName: regularUsers[0].collectionName
    } : 'No users found');

    console.log('📊 [getAllUsers] Found regular users:', regularUsers.length);
    regularUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name || user.email} (${user.email}) - ${user.role}`);
    });

    console.log('✅ [getAllUsers] Fetched all users successfully:', regularUsers.length);
    return { data: regularUsers };
  } catch (error) {
    console.error('❌ [getAllUsers] Error:', error);
    return { 
      error: error instanceof Error ? error.message : "Failed to fetch users" 
    };
  }
}
