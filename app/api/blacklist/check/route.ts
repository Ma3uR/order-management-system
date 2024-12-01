import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';
import PocketBase from 'pocketbase';

// Admin authentication function
async function authenticateAdmin(pb: PocketBase) {
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

export async function POST(request: Request) {
  // Create a new PocketBase instance for this request
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authenticate as admin before accessing blacklist
    await authenticateAdmin(pb);

    const { fullName, phoneNumber } = await request.json();

    const escapedFullName = fullName.replace(/['"\\]/g, '\\$&');
    const escapedPhoneNumber = phoneNumber.replace(/['"\\]/g, '\\$&');

    const records = await pb.collection('blacklist_entries').getList(1, 50, {
      filter: `fullName = "${escapedFullName}" || phoneNumber = "${escapedPhoneNumber}"`,
      $autoCancel: false // Disable auto-cancellation for this request
    });

    return NextResponse.json({ isBlacklisted: records.totalItems > 0 });
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return NextResponse.json({ 
      error: 'Failed to check blacklist',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Clear the auth store after the request
    pb.authStore.clear();
  }
} 