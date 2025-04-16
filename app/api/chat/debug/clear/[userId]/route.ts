import { NextResponse } from 'next/server';
import { clearUserChat, getUserChat } from '@/app/lib/chat-store';

// Debug route to test clearing a user's chat
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;
  
  if (!userId) {
    return NextResponse.json({ 
      success: false, 
      error: 'User ID is required' 
    }, { status: 400 });
  }
  
  try {
    console.log(`Debug route clearing chat for user: ${userId}`);
    
    // First check if the user has a chat
    const chatId = await getUserChat(userId);
    
    if (!chatId) {
      return NextResponse.json({
        success: false,
        error: 'No chat found for this user'
      }, { status: 404 });
    }
    
    // Clear the user's chat
    const success = await clearUserChat(userId);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: `Successfully cleared chat for user ${userId}`,
        chatId
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to clear chat'
      }, { status: 500 });
    }
  } catch (error) {
    console.error(`Error clearing chat for user ${userId}:`, error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear chat',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 