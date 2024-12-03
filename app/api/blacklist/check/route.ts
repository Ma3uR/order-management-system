import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function POST(request: Request) {
  try {
    const { fullName, phoneNumber } = await request.json();
    const normalizedPhone = phoneNumber.replace(/[^\d+]/g, '');
    
    const records = await pb.collection('blacklist_entries').getFullList({
      filter: `phoneNumber = "${normalizedPhone}" || fullName = "${fullName}"`,
    });

    return NextResponse.json({
      isBlacklisted: records.length > 0,
      record: records[0] || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check blacklist', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 