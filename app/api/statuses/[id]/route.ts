import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { name, color } = await request.json();
    const updatedStatus = await prisma.status.update({
      where: { id: params.id },
      data: { name, color },
    });
    return NextResponse.json(updatedStatus);
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 });
  }
}
