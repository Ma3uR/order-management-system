import { NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';
import { AxiosError } from 'axios';

export async function GET() {
  try {
    const defaultCurrency = await pb.collection('currency_options').getFirstListItem('isDefault=true');
    return NextResponse.json(defaultCurrency);
  } catch (error: unknown) {
    if (error instanceof AxiosError) {
      console.error('Error fetching default currency:', error.response?.data);
    }
    // Return a default currency if none is found
    return NextResponse.json({
      code: 'UAH',
      name: 'Ukrainian Hryvnia',
      symbol: '₴',
      isDefault: true
    });
  }
} 