import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const result = await prisma.blacklist.findMany();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Prisma test error:', error);
    return NextResponse.json({ error: 'Prisma test failed', details: error.message, stack: error.stack }, { status: 500 });
  }
}
