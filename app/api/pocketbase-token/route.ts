import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const DEFAULT_PASSWORD = 'defaultPass123!@#';

export async function POST(request: Request) {
  try {
    // Verify session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get PocketBase URL from environment
    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (!pbUrl) {
      throw new Error('NEXT_PUBLIC_POCKETBASE_URL is not configured');
    }

    const pb = new PocketBase(pbUrl);

    // Authenticate as admin
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!
    );

    let userId;
    try {
      // Try to find existing user
      const existingUser = await pb.collection('users').getFirstListItem(`email = "${session.user.email}"`);
      console.log('Found existing user:', existingUser.id);
      userId = existingUser.id;

      // Update existing user's password
      await pb.collection('users').update(userId, {
        password: DEFAULT_PASSWORD,
        passwordConfirm: DEFAULT_PASSWORD,
      });
      console.log('Updated existing user password');
    } catch {
      console.log('User not found, creating new user...');
      try {
        // Create new user
        const newUser = await pb.collection('users').create({
          email: session.user.email,
          password: DEFAULT_PASSWORD,
          passwordConfirm: DEFAULT_PASSWORD,
          verified: true,
          name: session.user.name || session.user.email.split('@')[0],
          emailVisibility: true,
        });
        userId = newUser.id;
        console.log('Created new user:', newUser.id);
      } catch (createError: any) {
        console.error('Error creating user:', createError?.response?.data);
        throw createError;
      }
    }

    // Authenticate with password
    try {
      const authData = await pb.collection('users').authWithPassword(
        session.user.email,
        DEFAULT_PASSWORD
      );
      console.log('Generated token for user');
      return NextResponse.json({ token: authData.token });
    } catch (tokenError) {
      console.error('Error generating token:', tokenError);
      throw tokenError;
    }
  } catch (error: any) {
    console.error('Token generation error:', error?.response?.data || error);
    return NextResponse.json({ 
      error: 'Failed to generate token',
      details: error?.response?.data || error.message 
    }, { status: 500 });
  }
} 