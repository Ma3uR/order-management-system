import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany();
    console.log('Fetched payment methods:', paymentMethods);
    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: 'Error fetching payment methods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newPaymentMethod = await prisma.paymentMethod.create({
      data: {
        name: data.name,
      },
    });
    return NextResponse.json(newPaymentMethod);
  } catch (error) {
    console.error('Error creating payment method:', error);
    return NextResponse.json({ error: 'Error creating payment method' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (paymentMethod?.orders.length) {
      return NextResponse.json({ error: 'Cannot delete payment method with associated orders' }, { status: 400 });
    }

    await prisma.paymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json({ error: 'Error deleting payment method' }, { status: 500 });
  }
}
