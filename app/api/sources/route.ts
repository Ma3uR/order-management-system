import { NextResponse } from 'next/server';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
import { SourcesResponse } from '@/app/types/pocketbase-types';

export async function GET() {
  try {
    const records = await authenticatedCall(() => 
      pb.collection('sources').getFullList<SourcesResponse>({
        sort: '-created',
      })
    );

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error in GET /api/sources:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await authenticatedCall(() => 
      pb.collection('sources').create(body)
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error in POST /api/sources:', error);
    return NextResponse.json({ 
      error: 'Failed to create source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 