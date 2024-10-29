import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    console.log('Attempting to fetch blacklist');
    const blacklist = await prisma.blacklist.findMany();
    console.log('Fetched blacklist:', blacklist);
    return NextResponse.json(blacklist);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch blacklist', 
      details: error.message,
      code: error.code,
      stack: error.stack
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
    const newItem = await prisma.blacklist.create({
      data: { fullName, phoneNumber },
    });
    console.log('Created blacklist item:', newItem);
    return NextResponse.json(newItem);
  } catch (error) {
    console.error('Error adding item to blacklist:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A blacklist item with this full name or phone number already exists' }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to add item to blacklist', 
      details: error.message, 
      code: error.code,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.blacklist.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from blacklist:', error);
    return NextResponse.json({ error: 'Failed to remove item from blacklist', details: error.message }, { status: 500 });
  }
}
