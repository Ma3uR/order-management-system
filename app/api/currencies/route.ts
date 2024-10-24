import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany();
    return NextResponse.json(currencies);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Error fetching currencies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newCurrency = await prisma.currency.create({
      data: {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
      },
    });
    return NextResponse.json(newCurrency);
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json({ error: 'Error creating currency' }, { status: 500 });
  }
}
