import { NextResponse } from 'next/server';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import type { DeliveryOptionsResponse } from '@/app/types/pocketbase-types';

export async function GET() {
  try {
    const records = await authenticatedCall(() => 
      pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>()
    );
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching delivery methods:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery methods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const record = await authenticatedCall(() => 
      pb.collection('delivery_options').create<DeliveryOptionsResponse>({
        name: data.name,
      })
    );
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating delivery method:', error);
    return NextResponse.json({ error: 'Error creating delivery method' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }  ) {
  try {
    const { name } = await request.json();
    const record = await pb.collection('delivery_options').update(params.id, {
      name,
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating delivery method:', error);
    return NextResponse.json({ error: 'Error updating delivery method' }, { status: 500 });
  }
}