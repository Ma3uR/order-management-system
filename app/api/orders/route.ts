import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function GET() {
  try {
    const records = await pb.collection('orders').getFullList({
      sort: '-created',
      expand: 'deliveryMethod,paymentMethod,status,currency'
    });
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Get default currency if not provided
    if (!data.currency) {
      const defaultCurrency = await pb.collection('currency_options').getFirstListItem('isDefault=true');
      data.currency = defaultCurrency.id;
    }

    // Get default status if not provided
    if (!data.status) {
      const defaultStatus = await pb.collection('status_options').getFirstListItem('name="Being processed by manager"');
      data.status = defaultStatus.id;
    }

    const record = await pb.collection('orders').create(data);
    const createdOrder = await pb.collection('orders').getOne(record.id, {
      expand: 'deliveryMethod,paymentMethod,status,currency'
    });

    return NextResponse.json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const order = await pb.collection('orders').update(id, data);
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await pb.collection('orders').delete(id);
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
} 