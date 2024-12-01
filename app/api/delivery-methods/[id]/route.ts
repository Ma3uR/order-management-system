import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await pb.collection('delivery_options').delete(params.id);
    return NextResponse.json({ message: 'Delivery method deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery method:', error);
    return NextResponse.json({ error: 'Error deleting delivery method' }, { status: 500 });
  }
}
