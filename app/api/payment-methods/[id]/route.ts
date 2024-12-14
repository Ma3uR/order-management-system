import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if payment method is used in any orders
    const pb = getPocketBase();
    const orders = await pb.collection('orders').getList(1, 1, {
      filter: `paymentMethod = "${params.id}"`,
    });

    if (orders.totalItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payment method that is being used in orders' },
        { status: 400 }
      );
    }

    await pb.collection('payment_options').delete(params.id);
    return NextResponse.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { error: 'Error deleting payment method' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await request.json();
    const pb = getPocketBase();
    const record = await pb.collection('payment_options').update(params.id, {
      name,
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating payment method:', error);
    return NextResponse.json(
      { error: 'Error updating payment method' },
      { status: 500 }
    );
  }
} 