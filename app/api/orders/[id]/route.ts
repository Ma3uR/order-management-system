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
    const updateData: any = {};
    
    // Add fields that can be updated
    if (data.orderNumber) updateData.orderNumber = data.orderNumber;
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
    if (data.deliveryPostNumber) updateData.deliveryPostNumber = data.deliveryPostNumber;
    if (data.products) updateData.products = data.products;
    if (data.numberOfItems) updateData.numberOfItems = data.numberOfItems;
    if (data.amount) updateData.amount = data.amount;
    if (data.statusId) updateData.status = data.statusId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    // Add delivery and payment method fields
    if (data.deliveryMethod) updateData.deliveryMethod = data.deliveryMethod;
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;

    const record = await pb.collection('orders').update(params.id, updateData);
    
    // Fetch the updated record with expanded relations
    const updatedRecord = await pb.collection('orders').getOne(params.id, {
      expand: 'deliveryMethod,paymentMethod,status,currency'
    });

    return NextResponse.json(updatedRecord);
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
