import { NextResponse } from 'next/server';
import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
pb.autoCancellation(false);

async function initPocketBase() {
  try {
    if (!pb.authStore.isValid) {
      await pb.admins.authWithPassword(
        process.env.POCKETBASE_ADMIN_EMAIL!,
        process.env.POCKETBASE_ADMIN_PASSWORD!
      );
    }
  } catch (error) {
    console.error('Failed to authenticate:', error);
    throw new Error('Failed to authenticate with PocketBase');
  }
}

export async function POST(request: Request) {
  try {
    await initPocketBase();
    
    const body = await request.json();
    console.log('Received request body:', body);

    // Get user ID from email
    let userId;
    try {
      const userRecord = await pb.collection('users').getFirstListItem(`email="${body.user_email}"`);
      userId = userRecord.id;
      console.log('Found user ID:', userId);
    } catch (e) {
      console.error('Failed to find user by email:', body.user_email);
      throw new Error('User not found');
    }

    // Create message with correct schema
    const record = await pb.collection('chat_messages').create({
      user: userId,              // User ID from lookup
      role: body.role,          // Plain text
      content: body.content,    // Plain text
      conversation_id: body.conversation_id  // Plain text
    });

    console.log('Created record:', record);
    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Error saving chat message:', {
      error: error.message,
      response: error.response?.data,
      originalError: error
    });
    return NextResponse.json(
      { error: 'Failed to save chat message', details: error.response?.data },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await initPocketBase();
    
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const conversationId = searchParams.get('conversation_id');
    const locale = searchParams.get('locale') || 'en';
    
    const filter = conversationId 
      ? `user_email = "${user}" && conversation_id = "${conversationId}"`
      : `user_email = "${user}"`;
      
    const records = await pb.collection('chat_messages').getList(1, 50, {
      filter,
      sort: 'created'
    });

    // If no messages exist, create initial greeting
    if (records.totalItems === 0) {
      // Get user ID first
      const userRecord = await pb.collection('users').getFirstListItem(`email="${user}"`);
      
      // Create initial message with greeting based on locale
      const greetings = {
        en: "Hello! I'm your AI assistant. I can help you with:\n- Viewing orders and their details\n- Checking sales statistics\n- Managing blacklist entries\n- And more!\n\nHow can I assist you today?",
        ua: "Вітаю! Я ваш ШІ-асистент. Я можу допомогти вам з:\n- Переглядом замовлень та їх деталей\n- Перевіркою статистики продажів\n- Управлінням чорним списком\n- Та іншим!\n\nЯк я можу допомогти вам сьогодні?"
      };

      const greeting = await pb.collection('chat_messages').create({
        user: userRecord.id,
        role: 'assistant',
        content: greetings[locale as keyof typeof greetings] || greetings.en,
        conversation_id: conversationId || crypto.randomUUID()
      });

      return NextResponse.json({
        ...records,
        items: [greeting],
        totalItems: 1
      });
    }

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages' },
      { status: 500 }
    );
  }
} 