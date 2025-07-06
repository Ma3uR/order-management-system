import { cookies } from 'next/headers';
import pb from '@/app/lib/pocketbase';

/**
 * Loads authentication from cookies for server actions.
 * This helper MUST be called at the top of every server action that needs user-level auth.
 * 
 * @returns {Promise<boolean>} - Returns true if authentication is valid, false otherwise
 */
export async function loadAuthFromCookies(): Promise<boolean> {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');
  
  if (!authCookie || !authCookie.value) {
    return false;
  }
  
  pb.authStore.loadFromCookie('pb_auth=' + authCookie.value);
  
  return pb.authStore.isValid;
}
