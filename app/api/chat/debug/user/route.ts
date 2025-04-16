import { NextResponse } from 'next/server';
import pb from '@/app/lib/pocketbase';
import { authenticatedCall } from '@/app/lib/pocketbase';

// Debug route to check chat association with users
export async function GET(request: Request) {
  try {
    // Get the list of chats with expanded user information
    const chats = await authenticatedCall(async () => {
      return await pb.collection('chats').getList(1, 50, {
        expand: 'user',
        sort: '-created'
      });
    });
    
    // Process the results to show user associations
    const result = chats.items.map(chat => ({
      chatId: chat.id,
      created: chat.created,
      updated: chat.updated,
      messageCount: typeof chat.messages === 'string' 
        ? JSON.parse(chat.messages || '[]').length 
        : (chat.messages || []).length,
      userId: chat.user || null,
      userInfo: chat.expand?.user ? {
        id: chat.expand.user.id,
        email: chat.expand.user.email,
        username: chat.expand.user.username
      } : null
    }));
    
    return NextResponse.json({
      success: true,
      totalChats: chats.totalItems,
      chats: result
    });
  } catch (error) {
    console.error('Error fetching chat user associations:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chat user associations',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 