import { NextResponse } from 'next/server';
import pb from '@/lib/pocketbase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const source = await pb.collection('sources').getOne(params.id);
    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const source = await pb.collection('sources').update(params.id, body);
    return NextResponse.json(source);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await pb.collection('sources').delete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
} 