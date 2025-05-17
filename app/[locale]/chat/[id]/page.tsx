import { loadChat } from '@/app/lib/chat-store';
import { AiChatBox } from '@/app/components/features/dashboard/AiChatBox';
import { cookies } from 'next/headers';

export default async function ChatIDPage({ params }: { params: { id: string, locale: string } }) {
  const { id } = params;
  
  // Get the current user from cookies
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');
  let userId = null;
  
  if (authCookie) {
    try {
      const authData = JSON.parse(decodeURIComponent(authCookie.value));
      if (authData.model && authData.model.id) {
        userId = authData.model.id;
      }
    } catch (error) {
      console.error('Error parsing auth cookie:', error);
    }
  }
  
  try {
    const messages = await loadChat(id);
    
    return (
      <div className="container mx-auto px-4 py-8">
        <AiChatBox id={id} userId={userId} initialMessages={messages} />
      </div>
    );
  } catch (error) {
    console.error(`Error loading chat ${id}:`, error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 rounded-lg">
          <h2 className="text-red-600 font-bold">Error loading chat</h2>
          <p>Could not load the requested chat. It may have been deleted or may not exist.</p>
        </div>
      </div>
    );
  }
} 