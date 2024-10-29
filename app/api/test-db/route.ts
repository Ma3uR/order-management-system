import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Test the database connection
    await prisma.$connect();
    console.log('Database connection successful');

    // Perform a simple query
    const count = await prisma.blacklist.count();
    console.log('Blacklist count:', count);

    return NextResponse.json({ success: true, message: 'Database connection successful', count });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ 
      error: 'Database connection failed', 
      details: error.message,
      code: error.code,
      stack: error.stack 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
