import PocketBase from 'pocketbase';

// Create a new PocketBase instance with environment variable
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Admin authentication function
export async function authenticateAdmin() {
  try {
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured');
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    if (!pb.authStore.isValid) {
      throw new Error('Admin authentication failed');
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    throw error;
  }
}

// Export as default and named export
export default pb;
export { pb }; 