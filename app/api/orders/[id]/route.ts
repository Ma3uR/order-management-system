import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Updating order:', params.id); // Debug log
    const data = await request.json();
    console.log('Update data:', data); // Debug log
    
    // Find the status first
    const status = await prisma.status.findFirst({
      where: { name: data.status.name }
    });

    if (!status) {
      return NextResponse.json(
        { error: 'Status not found' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { 
        id: params.id 
      },
      data: {
        status: {
          connect: {
            id: status.id
          }
        }
      },
      include: {
        deliveryMethod: true,
        paymentMethod: true,
        status: true,
        currency: true,
      },
    });

    console.log('Updated order:', order); // Debug log
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order', details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.order.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
