import { NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';

interface DeliveryMethod {
  id: string;
  name: string;
}

export async function GET() {
  try {
    const records = await pb.collection('delivery_options').getFullList<DeliveryMethod>();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching delivery methods:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery methods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const record = await pb.collection('delivery_options').create({
      name,
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating delivery method:', error);
    return NextResponse.json({ error: 'Error creating delivery method' }, { status: 500 });
  }
}
