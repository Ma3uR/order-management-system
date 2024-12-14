import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getPocketBase } from '@/lib/pocketbase';

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const data = await req.json();
  const { name, email } = data;

  try {
    const updatedUser = await getPocketBase().collection('users').update(session.user.id, {
      name,
      email,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}
