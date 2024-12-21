import { NextResponse } from 'next/server';
import { pb, authenticateAdmin } from '@/app/lib/pocketbase';
import { getServerSession } from 'next-auth';
import { auth } from '@/app/lib/auth';

export async function GET(request: Request) {
  try {
    // Check user authentication
    const session = await getServerSession(auth);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authenticate admin
    await authenticateAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '10');

    const resultList = await pb.collection('blacklist_entries').getList(page, perPage, {
      sort: '-created'
    });

    return NextResponse.json({
      items: resultList.items,
      page: resultList.page,
      perPage: resultList.perPage,
      totalItems: resultList.totalItems,
      totalPages: resultList.totalPages
    });
  } catch (error) {
    console.error('Error fetching blacklist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blacklist' },
      { status: 500 }
    );
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
    const record = await pb.collection('blacklist_entries').create(data);
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating blacklist entry:', error);
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
    await pb.collection('blacklist_entries').delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blacklist entry:', error);
    return NextResponse.json({ error: 'Error deleting blacklist entry' }, { status: 500 });
  }
}
