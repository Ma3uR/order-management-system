import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);

// Initialize PocketBase with admin credentials
async function initPocketBase() {
  try {
    await pb.admins.authWithPassword(
      process.env.POCKETBASE_ADMIN_EMAIL!,
      process.env.POCKETBASE_ADMIN_PASSWORD!
    );
    pb.autoCancellation(false); // Prevent auto-cancellation
  } catch (error) {
    console.error('PocketBase authentication error:', error);
    throw error;
  }
}

// Helper function to get or create user
async function getOrCreateUser(email: string) {
  try {
    // Try to find existing user
    const user = await pb.collection('users').getFirstListItem(`email = "${email}"`);
    return user.id;
  } catch (error) {
    // If user doesn't exist, create one
    try {
      const newUser = await pb.collection('users').create({
        email: email,
        username: email.split('@')[0],
        emailVisibility: true,
        password: crypto.randomUUID(), // Generate random password
        passwordConfirm: crypto.randomUUID(),
      });
      return newUser.id;
    } catch (createError) {
      console.error('Error creating user:', createError);
      // Return a default system user ID if everything fails
      return 'system';
    }
  }
}

export async function GET(request: Request) {
  try {
    await initPocketBase();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
    }

    const records = await pb.collection('chat_messages').getList(1, 50, {
      filter: `conversation_id = "${conversationId}"`,
      sort: 'created'
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initPocketBase();
    const data = await request.json();
    
    // Get or create user ID from email
    const userId = await getOrCreateUser(data.user);
    
    // Create message with user ID instead of email
    const messageData = {
      user: userId,
      role: data.role,
      content: data.content,
      conversation_id: data.conversation_id
    };

    console.log('Creating message with data:', messageData);
    const record = await pb.collection('chat_messages').create(messageData);
    
    return NextResponse.json(record);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ 
      error: 'Failed to create message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 