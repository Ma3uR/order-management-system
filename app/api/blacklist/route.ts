import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getServerSession } from 'next-auth';
import { auth } from '@/lib/auth';

// Create a new PocketBase instance for admin operations
const pb = new PocketBase('http://pocketbase-d04wg4wgw0cs8kcwoww88w0k.78.47.226.230.sslip.io');

// Admin authentication
async function authenticateAdmin() {
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

export async function GET() {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    console.log('Admin authenticated:', pb.authStore.isValid);

    const records = await pb.collection('blacklist_entries').getFullList();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ 
      error: 'Error fetching blacklist',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const data = await request.json();
    const record = await pb.collection('blacklist_entries').create(data);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating blacklist entry:', error);
    return NextResponse.json({ error: 'Error creating blacklist entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const { id } = await request.json();
    await pb.collection('blacklist_entries').delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blacklist entry:', error);
    return NextResponse.json({ error: 'Error deleting blacklist entry' }, { status: 500 });
  }
}
