import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const defaultCurrency = await prisma.currency.findFirst({
      where: { isDefault: true },
    });

    if (!defaultCurrency) {
      return NextResponse.json(
        { error: 'No default currency found' },
        { status: 404 }
      );
    }

    return NextResponse.json(defaultCurrency);
  } catch (error) {
    console.error('Error fetching default currency:', error);
    return NextResponse.json(
      { error: 'Error fetching default currency' },
      { status: 500 }
    );
  }
} 