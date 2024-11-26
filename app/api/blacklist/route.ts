import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

// Add this type at the top of the file
interface CustomError extends Error {
  code?: string;
}

export async function GET() {
  try {
    console.log('Attempting to fetch blacklist');
    const blacklist = await pb.collection('blacklist').getFullList();
    console.log('Fetched blacklist:', blacklist);
    return NextResponse.json(blacklist);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    const err = error as CustomError;
    return NextResponse.json({ 
      error: 'Failed to fetch blacklist', 
      details: err.message || 'Unknown error occurred',
      code: err.code || 'Unknown error code',
      stack: err.stack || 'Unknown stack trace'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { fullName, phoneNumber } = await request.json();
    console.log('Received data:', { fullName, phoneNumber });

    if (!fullName || !phoneNumber) {
      return NextResponse.json({ error: 'Full name and phone number are required' }, { status: 400 });
    }

    console.log('Attempting to create blacklist item');
    const newItem = await pb.collection('blacklist').create({
      data: { fullName, phoneNumber },
    });
    console.log('Created blacklist item:', newItem);
    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error adding item to blacklist:', error);
    const err = error as CustomError;
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'A blacklist item with this full name or phone number already exists' }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to add item to blacklist', 
      details: err.message || 'Unknown error occurred',
      code: err.code || 'Unknown error code',
      stack: err.stack || 'Unknown stack trace'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await pb.collection('blacklist').delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from blacklist:', error);
    const err = error as CustomError;
    return NextResponse.json({ 
      error: 'Failed to remove item from blacklist', 
      details: err.message || 'Unknown error occurred',
      code: err.code || 'Unknown error code',
      stack: err.stack || 'Unknown stack trace'
    }, { status: 500 });
  }
}
