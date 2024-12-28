import { NextResponse } from 'next/server';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { CurrencyOptionsResponse } from '@/app/types/pocketbase-types';

export async function GET() {
  try {
    console.log('Fetching currencies...');
    const records = await authenticatedCall(() => 
      pb.collection('currency_options').getFullList<CurrencyOptionsResponse>()
    );
    console.log('Fetched records:', records);
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json({ error: 'Error fetching currencies' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const record = await authenticatedCall(() => 
      pb.collection('currency_options').create<CurrencyOptionsResponse>({
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        isDefault: data.isDefault ?? false,
      })
    );
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating currency:', error);
    return NextResponse.json({ error: 'Error creating currency' }, { status: 500 });
  }
}
