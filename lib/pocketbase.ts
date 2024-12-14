import PocketBase from 'pocketbase';

let pb: PocketBase | null = null;

export function initializePocketBase() {
  const pocketbaseUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || process.env.POCKETBASE_URL;

  if (!pocketbaseUrl) {
    throw new Error('PocketBase URL is not set. Please set either NEXT_PUBLIC_POCKETBASE_URL or POCKETBASE_URL environment variable');
  }

  const baseUrl = pocketbaseUrl.endsWith('/') ? pocketbaseUrl : `${pocketbaseUrl}/`;

  pb = new PocketBase(baseUrl);
  return pb;
}

// Get PocketBase instance, initializing if necessary
export function getPocketBase(): PocketBase {
  if (!pb) {
    pb = initializePocketBase();
  }
  return pb;
}

// Admin authentication function 
export async function authenticateAdmin() {
  const client = getPocketBase();
  
  try {
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    console.log('Admin authentication attempt:', {
      email: adminEmail ? 'set' : 'not set',
      password: adminPassword ? 'set' : 'not set'
    });
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured');
    }

    await client.admins.authWithPassword(adminEmail, adminPassword);
    
    if (!client.authStore.isValid) {
      throw new Error('Admin authentication failed');
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    throw error;
  }
}

// Export the getter function as default
export default getPocketBase; 