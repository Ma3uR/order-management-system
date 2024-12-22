import { NextResponse } from 'next/server';
import { blacklistEntrySchema } from '@/app/lib/validations/blacklist';
import pb from '@/app/lib/pocketbase';
import { authenticateAdmin } from '@/app/lib/pocketbase';
import { getServerSession } from 'next-auth';
import { auth } from '@/app/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val)).default('1'),
  perPage: z.string().transform(val => parseInt(val)).default('10'),
  search: z.string().default(''),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();

    const { searchParams } = new URL(request.url);
    const { page, perPage, search } = querySchema.parse({
      page: searchParams.get('page'),
      perPage: searchParams.get('perPage'),
      search: searchParams.get('search'),
    });

    const filter = search 
      ? `fullName ~ "${search}" || phoneNumber ~ "${search}" || city ~ "${search}"`
      : '';

    const resultList = await pb.collection('blacklist_entries').getList(page, perPage, {
      sort: '-created',
      filter,
    });

    return NextResponse.json(resultList);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to fetch blacklist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const data = await request.json();
    
    // Validate the input data
    const validatedData = blacklistEntrySchema.parse(data);
    
    const record = await pb.collection('blacklist_entries').create(validatedData);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating blacklist entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error creating blacklist entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await authenticateAdmin();
    const { id } = await request.json();
    
    // Validate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await pb.collection('blacklist_entries').delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blacklist entry:', error);
    return NextResponse.json({ error: 'Error deleting blacklist entry' }, { status: 500 });
  }
}
