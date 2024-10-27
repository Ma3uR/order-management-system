import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const deliveryMethods = await prisma.deliveryMethod.findMany();
    console.log('Fetched delivery methods:', deliveryMethods);
    return NextResponse.json(deliveryMethods);
  } catch (error) {
    console.error('Error fetching delivery methods:', error);
    return NextResponse.json({ error: 'Error fetching delivery methods' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    const deliveryMethod = await prisma.deliveryMethod.create({
      data: { name },
    });
    return NextResponse.json(deliveryMethod);
  } catch (error) {
    console.error('Error creating delivery method:', error);
    return NextResponse.json({ error: 'Error creating delivery method' }, { status: 500 });
  }
}
