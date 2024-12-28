import { NextResponse } from 'next/server';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const source = await authenticatedCall(() => pb.collection('sources').getOne(params.id));
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
    
    const body = await request.json();
    const source = await authenticatedCall(() => pb.collection('sources').update(params.id, body));
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
    // Check if source is used in any orders
    const orders = await authenticatedCall(() => pb.collection('orders').getList(1, 1, {
      filter: `source = "${params.id}"`,
    }));

    if (orders.totalItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete source that is being used in orders' },
        { status: 400 }
      );
    }

    await authenticatedCall(() => pb.collection('sources').delete(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json({ 
      error: 'Failed to delete source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 