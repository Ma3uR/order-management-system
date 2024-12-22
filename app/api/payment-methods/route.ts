import { NextResponse } from 'next/server';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { PaymentOptionsResponse } from '@/app/types/pocketbase-types';

export async function GET() {
  try {
    const records = await authenticatedCall(() => 
      pb.collection('payment_options').getFullList<PaymentOptionsResponse>()
    );
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const record = await authenticatedCall(() => 
      pb.collection('payment_options').create<PaymentOptionsResponse>({
        name: data.name,
      })
    );
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json({ error: 'Error creating payment method' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    
    // Check if payment method is used in any orders
    const orders = await authenticatedCall(() => 
      pb.collection('orders').getList(1, 1, {
        filter: `paymentMethod = "${id}"`,
      })
    );

    if (orders.totalItems > 0) {
      return NextResponse.json(
        { error: 'Cannot delete payment method with associated orders' }, 
        { status: 400 }
      );
    }

    await authenticatedCall(() => 
      pb.collection('payment_options').delete(id)
    );
    return NextResponse.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: 'Error deleting payment method' }, { status: 500 });
  }
}
