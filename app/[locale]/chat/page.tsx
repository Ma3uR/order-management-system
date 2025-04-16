import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { loadUserChat, createOrGetUserChat } from '@/app/lib/chat-store';

export default async function ChatPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  
  // Get the current user from cookies
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');
  
  // If user is not logged in, show a message
  if (!authCookie) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-blue-600 font-bold">Login Required</h2>
          <p>Please log in to access your chat.</p>
        </div>
      </div>
    );
  }
  
  try {
    // Parse user ID from cookie
    const authData = JSON.parse(decodeURIComponent(authCookie.value));
    if (!authData.model || !authData.model.id) {
      throw new Error('Invalid auth data');
    }
    
    const userId = authData.model.id;
    console.log(`Loading chat for user ID: ${userId}`);
    
    // Load or create the user's chat
    const { chatId } = await loadUserChat(userId);
    
    if (!chatId) {
      // Create a new chat for the user
      console.log(`No chat found for user ${userId}, creating one`);
      const newChatId = await createOrGetUserChat(userId);
      
      if (newChatId) {
        console.log(`Created chat ${newChatId} for user ${userId}`);
        redirect(`/${locale}/chat/${newChatId}`);
      } else {
        throw new Error('Failed to create chat');
      }
    } else {
      console.log(`Found chat ${chatId} for user ${userId}`);
      redirect(`/${locale}/chat/${chatId}`);
    }
  } catch (error) {
    console.error('Error handling user chat:', error);
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 rounded-lg">
          <h2 className="text-red-600 font-bold">Error loading chat</h2>
          <p>Could not load your chat. Please try again later.</p>
        </div>
      </div>
    );
  }
} 