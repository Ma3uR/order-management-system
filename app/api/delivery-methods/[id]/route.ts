import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.deliveryMethod.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Delivery method deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery method:', error);
    return NextResponse.json({ error: 'Error deleting delivery method' }, { status: 500 });
  }
}
