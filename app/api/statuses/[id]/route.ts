import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Attempting to delete status with ID:', params.id);
    
    // Check if status is used in any orders
    const orders = await pb.collection('orders').getList(1, 1, {
      filter: `status = "${params.id}"`,
    });

    console.log('Orders using this status:', orders.totalItems);

    if (orders.totalItems > 0) {
      console.log('Status is being used in orders, cannot delete');
      return NextResponse.json(
        { error: 'Cannot delete status that is being used in orders' },
        { status: 400 }
      );
    }

    await pb.collection('status_options').delete(params.id);
    console.log('Status deleted successfully');
    
    return NextResponse.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Detailed error deleting status:', {
      error,
      statusId: params.id,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return NextResponse.json(
      { 
        error: 'Error deleting status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, color, priority } = await request.json();
    const record = await pb.collection('status_options').update(params.id, {
      name,
      color,
      priority: priority || 0
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Error updating status' },
      { status: 500 }
    );
  }
}
