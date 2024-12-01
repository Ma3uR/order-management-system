import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { value } = body;

    const records = await pb.collection('blacklist').getFullList({
      filter: `value = "${value}"`,
    });

    return NextResponse.json({
      isBlacklisted: records.length > 0,
      record: records[0] || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check blacklist' },
      { status: 500 }
    );
  }
} 