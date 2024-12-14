import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const pb = getPocketBase();
    await pb.collection('delivery_options').delete(params.id);
    return NextResponse.json({ message: 'Delivery method deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery method:', error);
    return NextResponse.json({ error: 'Error deleting delivery method' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name } = await request.json();
    const pb = getPocketBase();
    const record = await pb.collection('delivery_options').update(params.id, {
      name,
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error updating delivery method:', error);
    return NextResponse.json(
      { error: 'Error updating delivery method' },
      { status: 500 }
    );
  }
}
