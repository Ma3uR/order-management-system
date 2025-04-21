import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pb from '@/app/lib/pocketbase';

export async function PUT(req: Request) {
  // Get auth cookie and try to authenticate with PocketBase
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');
  
  if (!authCookie || !authCookie.value) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    // Load auth data from cookie
    pb.authStore.loadFromCookie(`pb_auth=${authCookie.value}`);
    
    if (!pb.authStore.isValid || !pb.authStore.model?.id) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }
    
    const userId = pb.authStore.model.id;
    const data = await req.json();
    const { name, email } = data;

    const updatedUser = await pb.collection('users').update(userId, {
      name,
      email,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error updating user' }, { status: 500 });
  }
}
