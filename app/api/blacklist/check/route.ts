import { NextResponse } from 'next/server';
import pb, { getPocketBase } from '@/lib/pocketbase';

export async function POST(request: Request) {
  try {
    const pb = getPocketBase();
    const { fullName, phoneNumber } = await request.json();
    
    // Authenticate admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!
    );

    // Normalize and escape the inputs
    const normalizedPhone = (phoneNumber || '').replace(/[^\d+]/g, '');
    const escapedFullName = fullName?.replace(/"/g, '\\"') || '';
    
    let filter = '';
    if (normalizedPhone && escapedFullName) {
      filter = `phoneNumber = "${normalizedPhone}" || fullName ~ "${escapedFullName}"`;
    } else if (normalizedPhone) {
      filter = `phoneNumber = "${normalizedPhone}"`;
    } else if (escapedFullName) {
      filter = `fullName ~ "${escapedFullName}"`;
    }

    if (!filter) {
      return NextResponse.json({ isBlacklisted: false, record: null });
    }

    const records = await pb.collection('blacklist_entries').getFullList({
      filter: filter,
    });

    return NextResponse.json({
      isBlacklisted: records.length > 0,
      record: records[0] || null,
    });
  } catch (error) {
    console.error('Blacklist check error:', error);
    return NextResponse.json(
      { error: 'Failed to check blacklist', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 