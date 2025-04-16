import { NextResponse } from 'next/server';
import { chatExists, loadChat } from '@/app/lib/chat-store';
import pb from '@/app/lib/pocketbase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  try {
    console.log(`Debug route checking chat: ${id}`);
    
    // Check if the chat exists
    const exists = await chatExists(id);
    
    if (!exists) {
      return NextResponse.json({
        exists: false,
        id,
        message: `Chat with ID ${id} does not exist`
      }, { status: 404 });
    }
    
    // Load the chat record to get user info
    const chatRecord = await pb.collection('chats').getOne(id, { expand: 'user' });
    const userId = chatRecord.user || null;
    const userInfo = chatRecord.expand?.user ? {
      id: chatRecord.expand.user.id,
      email: chatRecord.expand.user.email,
      username: chatRecord.expand.user.username
    } : null;
    
    // Load the chat messages
    const messages = await loadChat(id);
    
    return NextResponse.json({
      exists: true,
      id,
      userId,
      user: userInfo,
      created: chatRecord.created,
      updated: chatRecord.updated,
      messageCount: messages.length,
      firstMessage: messages.length > 0 ? messages[0] : null,
      lastMessage: messages.length > 0 ? messages[messages.length - 1] : null
    });
  } catch (error) {
    console.error(`Error checking chat ${id}:`, error);
    
    return NextResponse.json({
      error: 'Failed to check chat',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 