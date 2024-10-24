import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const statuses = await prisma.status.findMany();
    return NextResponse.json(statuses);
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json({ error: 'Error fetching statuses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newStatus = await prisma.status.create({
      data: {
        name: data.name,
        color: data.color,
      },
    });
    return NextResponse.json(newStatus);
  } catch (error) {
    console.error('Error creating status:', error);
    return NextResponse.json({ error: 'Error creating status' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const status = await prisma.status.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (status?.orders.length) {
      return NextResponse.json({ error: 'Cannot delete status with associated orders' }, { status: 400 });
    }

    await prisma.status.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error deleting status:', error);
    return NextResponse.json({ error: 'Error deleting status' }, { status: 500 });
  }
}
