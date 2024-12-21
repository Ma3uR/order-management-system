import { NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';

export async function GET() {
  try {
    const defaultCurrency = await pb.collection('currencies').getFirstListItem('isDefault=true');
    return NextResponse.json(defaultCurrency);
  } catch (error) {
    return NextResponse.json({ error: 'Default currency not found' }, { status: 404 });
  }
} 