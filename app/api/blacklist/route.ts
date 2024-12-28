import { NextResponse } from 'next/server';
import { blacklistEntrySchema } from '@/app/lib/validations/blacklist';
import pb, { authenticatedCall } from '@/app/lib/pocketbase';
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

    const { searchParams } = new URL(request.url);
    const { page, perPage, search } = querySchema.parse({
      page: searchParams.get('page'),
      perPage: searchParams.get('perPage'),
      search: searchParams.get('search'),
    });

    const filter = search 
      ? `fullName ~ "${search}" || phoneNumber ~ "${search}" || city ~ "${search}"`
      : '';

    console.log('Fetching blacklist with params:', { page, perPage, filter });

    const resultList = await authenticatedCall(() => 
      pb.collection('blacklist_entries').getList(page, perPage, {
        sort: '-created',
        filter,
      })
    );

    console.log('Blacklist results:', {
      totalItems: resultList.totalItems,
      totalPages: resultList.totalPages,
      page: resultList.page,
      itemsCount: resultList.items.length
    });

    return NextResponse.json(resultList);
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to fetch blacklist',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const validatedData = blacklistEntrySchema.parse(data);
    
    const record = await authenticatedCall(() => 
      pb.collection('blacklist_entries').create(validatedData)
    );

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating blacklist entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Error creating blacklist entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await authenticatedCall(() => 
      pb.collection('blacklist_entries').delete(id)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blacklist entry:', error);
    return NextResponse.json({ 
      error: 'Error deleting blacklist entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
