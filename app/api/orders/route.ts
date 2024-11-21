import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        deliveryMethod: true,
        paymentMethod: true,
        status: true,
        currency: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received order data:', data);

    // Get the default currency if not provided
    if (!data.currencyId) {
      const defaultCurrency = await prisma.currency.findFirst({
        where: { isDefault: true }
      });
      if (!defaultCurrency) {
        return NextResponse.json(
          { error: 'Default currency not found' },
          { status: 400 }
        );
      }
      data.currencyId = defaultCurrency.id;
    }

    // Get the default status if not provided
    if (!data.statusId) {
      const status = await prisma.status.findFirst({
        where: { name: 'Being processed by manager' }
      });
      if (!status) {
        return NextResponse.json(
          { error: 'Default status not found' },
          { status: 400 }
        );
      }
      data.statusId = status.id;
    }

    // Create the order with the correct relationships
    const order = await prisma.order.create({
      data: {
        orderNumber: data.orderNumber,
        source: data.source,
        deliveryMethod: {
          connect: {
            id: data.deliveryMethod.id
          }
        },
        deliveryPostNumber: data.deliveryPostNumber,
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        products: data.products, // Already stringified from frontend
        numberOfItems: Number(data.numberOfItems),
        paymentMethod: {
          connect: {
            id: data.paymentMethod.id
          }
        },
        amount: Number(data.amount),
        status: {
          connect: {
            id: data.statusId
          }
        },
        currency: {
          connect: {
            id: data.currencyId
          }
        },
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
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error creating order', details: error },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const order = await prisma.order.update({
      where: { id },
      data,
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

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.order.delete({
      where: { id },
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