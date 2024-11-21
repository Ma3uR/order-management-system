import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
    const { name, color, priority } = await request.json();
    const newStatus = await prisma.status.create({
      data: {
        name,
        color,
        priority: typeof priority === 'number' ? priority : 0,
      },
    });
    return NextResponse.json(newStatus);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A status with this name already exists' }, 
          { status: 400 }
        );
      }
    }
    console.error('Error creating status:', error);
    return NextResponse.json(
      { error: 'Error creating status' }, 
      { status: 500 }
    );
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

export async function PUT(request: Request) {
  try {
    const { id, name, color, priority } = await request.json();
    const updatedStatus = await prisma.status.update({
      where: { id },
      data: {
        name,
        color,
        priority: typeof priority === 'number' ? priority : 0,
      },
    });
    return NextResponse.json(updatedStatus);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A status with this name already exists' }, 
          { status: 400 }
        );
      }
    }
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Error updating status' }, 
      { status: 500 }
    );
  }
}
