import { NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

// Admin authentication
async function authenticateAdmin() {
  try {
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured');
    }

    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (error) {
    console.error('Admin authentication error:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await authenticateAdmin();
    const records = await pb.collection('sources').getFullList({
      sort: '-created',
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in GET /api/sources:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await authenticateAdmin();
    const body = await request.json();
    const record = await pb.collection('sources').create(body);

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error in POST /api/sources:', error);
    return NextResponse.json({ 
      error: 'Failed to create source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 