import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function GET() {
  try {
    const defaultCurrency = await pb.collection('currencies').getFirstListItem('isDefault=true');

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