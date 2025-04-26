import pb, { authenticatedCall } from '@/app/lib/pocketbase';

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