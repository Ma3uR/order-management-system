import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

type OrderData = {
  id: string;
  status: string;
};

const dummyUser = {
  id: '123',
  email: 'test@test.com',
  username: 'test',
  name: 'test'
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await pb.collection('orders').getOne(params.id);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    
    // Create update data object
    const updateData: Record<string, unknown> = {};
    
    // Handle status update
    if (data.statusId) {
      updateData.status = data.statusId;
    }
    
    // Handle full order update
    if (data.orderNumber) {
      Object.assign(updateData, {
        orderNumber: data.orderNumber,
        source: data.source,
        deliveryMethod: data.deliveryMethod.id,
        deliveryPostNumber: data.deliveryPostNumber,
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        products: data.products,
        numberOfItems: data.numberOfItems,
        paymentMethod: data.paymentMethod.id,
        amount: data.amount
      });
    }

    const order = await pb.collection('orders').update(params.id, updateData);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await pb.collection('orders').delete(params.id);
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
