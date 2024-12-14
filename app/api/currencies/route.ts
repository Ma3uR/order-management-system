import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';

export async function GET() {
  try {
    const pb = getPocketBase();
    const records = await pb.collection('currency_options').getFullList();
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Error fetching currencies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const pb = getPocketBase();
    const data = await request.json();
    const record = await pb.collection('currency_options').create({
      code: data.code,
      name: data.name,
      symbol: data.symbol,
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json({ error: 'Error creating currency' }, { status: 500 });
  }
}
