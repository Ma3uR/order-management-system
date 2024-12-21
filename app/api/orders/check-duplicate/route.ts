import { NextRequest, NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderNumber } = body;

    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required' }, { status: 400 });
    }

    // Check if order number exists
    const existingOrders = await pb.collection('orders').getList(1, 1, {
      filter: `orderNumber = "${orderNumber}"`,
    });

    return NextResponse.json({
      isDuplicate: existingOrders.totalItems > 0
    });

  } catch (error) {
    console.error('Error checking duplicate order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 