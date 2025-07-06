import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { getUserRole } from '@/app/lib/auth/user-roles';
import { UsersRoleOptions, UsersResponse } from '@/app/types/pocketbase-types';

/**
 * Verifies that a user exists in the database
 */
export async function verifyUserId(userId: string): Promise<boolean> {
  try {
    if (!userId) {
      console.log('verifyUserId: userId is empty or null');
      return false;
    }    
    // First try direct lookup to see if user exists
    try {
      await authenticatedCall(() => pb.collection('users').getOne(userId));
      return true;
    } catch (error) {
      // If direct lookup fails, try to search for the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`verifyUserId: Direct lookup failed for "${userId}", trying list: ${errorMessage}`);
      
      const users = await authenticatedCall(() => pb.collection('users').getList(1, 1, {
        filter: `id = "${userId}"`
      }));
      
      if (users.totalItems > 0) {
        return true;
      }
      
      return false;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`verifyUserId: Error verifying user "${userId}":`, error.message);
    } else {
      console.error(`verifyUserId: Error verifying user "${userId}":`, String(error));
    }
    return false;
  }
}

/**
 * Shared authentication helper for API routes
 * Returns authenticated user data or null if authentication fails
 */
export async function getAuthUser(): Promise<{
  user: UsersResponse;
  role: UsersRoleOptions;
} | null> {
  try {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('pb_auth');
    
    if (!authCookie || !authCookie.value) {
      return null;
    }
    
    pb.authStore.loadFromCookie(`pb_auth=${authCookie.value}`);
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      return null;
    }
    
    const userId = pb.authStore.model.id;
    const user = await pb.collection('users').getOne(userId) as UsersResponse;
    const role = await getUserRole(userId);
    
    if (!role) {
      return null;
    }
    
    return {
      user,
      role
    };
  } catch (error) {
    console.error('Error in getAuthUser:', error);
    return null;
  }
}

export function createAuthErrorResponse(message: string = 'Not authenticated – please log in again.', status: number = 401): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function createPermissionErrorResponse(message: string = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
