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
    const data = await request.json();
    
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        orderNumber: data.orderNumber,
        source: data.source,
        deliveryMethod: {
          connect: { id: data.deliveryMethod.id }
        },
        deliveryPostNumber: data.deliveryPostNumber,
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        products: data.products,
        numberOfItems: data.numberOfItems,
        paymentMethod: {
          connect: { id: data.paymentMethod.id }
        },
        amount: data.amount,
        status: {
          connect: { id: data.status.id }
        }
      },
      include: {
        deliveryMethod: true,
        paymentMethod: true,
        status: true,
        currency: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
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
