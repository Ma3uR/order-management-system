import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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
    
    // Create update data object
    const updateData: Prisma.OrderUpdateInput = {};
    
    // Handle status update
    if (data.statusId) {
      updateData.status = {
        connect: { id: data.statusId }
      };
    }
    
    // Handle full order update
    if (data.orderNumber) {
      updateData.orderNumber = data.orderNumber;
      updateData.source = data.source;
      updateData.deliveryMethod = {
        connect: { id: data.deliveryMethod.id }
      };
      updateData.deliveryPostNumber = data.deliveryPostNumber;
      updateData.phoneNumber = data.phoneNumber;
      updateData.fullName = data.fullName;
      updateData.products = data.products;
      updateData.numberOfItems = data.numberOfItems;
      updateData.paymentMethod = {
        connect: { id: data.paymentMethod.id }
      };
      updateData.amount = data.amount;
    }

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
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
