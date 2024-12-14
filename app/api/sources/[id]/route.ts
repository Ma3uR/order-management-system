import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';
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

    const pb = getPocketBase();
    await pb.admins.authWithPassword(adminEmail, adminPassword);
  } catch (error) {
    console.error('Admin authentication error:', error);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const pb = getPocketBase();
    const source = await pb.collection('sources').getOne(params.id);
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error fetching source:', error);
    return NextResponse.json({ 
      error: 'Source not found',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const body = await request.json();
    const pb = getPocketBase();
    const source = await pb.collection('sources').update(params.id, body);
    return NextResponse.json(source);
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json({ 
      error: 'Failed to update source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    
    // Check if source is used in any orders
    const pb = getPocketBase();
    const orders = await pb.collection('orders').getList(1, 1, {
      filter: `source = "${params.id}"`,
    });

    if (orders.totalItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete source that is being used in orders' },
        { status: 400 }
      );
    }

    await pb.collection('sources').delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json({ 
      error: 'Failed to delete source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 