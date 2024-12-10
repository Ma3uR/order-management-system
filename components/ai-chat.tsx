"use client"

import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTranslations } from 'next-intl'
import { motion } from "framer-motion"
import { useEffect, useState } from 'react'
import { useSession } from "next-auth/react"

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatMessageRecord {
  id: string;
  user: string;
  role: string;
  content: string;
  conversation_id: string;
  created: string;
}

export function AiChat() {
  const { data: session } = useSession()
  const t = useTranslations('AiChat')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState(() => {
    // Try to get existing conversation ID from localStorage
    const storedId = localStorage.getItem('chatConversationId');
    if (storedId) return storedId;
    
    // Create new conversation ID if none exists
    const newId = crypto.randomUUID();
    localStorage.setItem('chatConversationId', newId);
    return newId;
  });

  // Load messages from API route
  const loadMessages = async () => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      const response = await fetch(`/api/chat-messages?conversationId=${conversationId}`);
      
      if (!response.ok) {
        console.error('Failed to fetch messages:', response.status, response.statusText);
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      console.log('Received messages data:', data);
      
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        console.log('Found messages:', data.items.length);
        const formattedMessages: Message[] = data.items.map((record: ChatMessageRecord) => ({
          role: record.role as 'user' | 'assistant',
          content: record.content,
          timestamp: new Date(record.created).getTime()
        }));
        console.log('Formatted messages:', formattedMessages);
        setMessages(formattedMessages);
      } else {
        // Just show the greeting message in UI without saving to DB
        console.log('No messages found, showing greeting');
        setMessages([{
          role: 'assistant',
          content: "Hello! I'm your AI assistant. I can help you with:\n- Viewing orders and their details\n- Checking sales statistics\n- Managing blacklist entries\n- And more!\n\nHow can I assist you today?",
          timestamp: Date.now()
        }]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Save message using API route
  const saveMessage = async (message: Message) => {
    try {
      const response = await fetch('/api/chat-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: session?.user?.email || 'anonymous',
          role: message.role,
          content: message.content,
          conversation_id: conversationId
        }),
      });

      if (!response.ok) throw new Error('Failed to save message');
      
      return await response.json();
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Load messages from PocketBase on mount
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  const formatPocketBaseResult = (result: any) => {
    if (!result || !result.records || result.records.length === 0) {
      return 'No records found';
    }
    
    const { records, total } = result;
    
    return `Found ${total} record(s):\n${records.map((record: any, index: number) => {
      if (typeof record === 'object') {
        // Format each record based on its type
        if ('orderNumber' in record) {
          // Order record
          return `${index + 1}. Order #${record.orderNumber}
Amount: ${record.amount}
Customer: ${record.customer}
Status: ${record.status}
Payment: ${record.payment}
Source: ${record.source}
Created: ${record.created}`;
        } else {
          // Generic record
          return `${index + 1}. ${Object.entries(record)
            .filter(([key]) => !key.startsWith('_'))
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}`;
        }
      }
      return `${index + 1}. ${JSON.stringify(record)}`;
    }).join('\n\n')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { 
      role: 'user',
      content: input,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Save user message to PocketBase
      await saveMessage(userMessage);

      // Get AI response
      const response = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          history: messages.slice(-5), // Only use last 5 messages for context
          user: session?.user?.email || 'anonymous' // Pass user info
        }),
      })

      const data = await response.json()
      
      let assistantMessage = ''
      if (data.error) {
        assistantMessage = `Error: ${data.error}`
      } else if (data.records) {
        assistantMessage = formatPocketBaseResult(data)
      } else {
        assistantMessage = 'No results found'
      }

      const assistantMessageObj: Message = { 
        role: 'assistant',
        content: assistantMessage,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessageObj])

      // Save assistant message to PocketBase
      await saveMessage(assistantMessageObj);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = { 
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage])
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full shadow-lg dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center gap-3 p-4">
          <Avatar className="h-8 w-8 md:h-10 md:w-10">
            <AvatarFallback>
              <Bot className="h-4 w-4 md:h-5 md:w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h3 className="text-sm md:text-base font-semibold dark:text-gray-100">{t('title')}</h3>
            <p className="text-xs md:text-sm text-muted-foreground">PocketBase Assistant</p>
          </div>
        </CardHeader>
        <CardContent className="h-[240px] md:h-[320px] border-y bg-muted/50 dark:bg-gray-900/50 p-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className="flex items-start gap-3 mb-4">
              <Avatar className="mt-0.5">
                <AvatarFallback>
                  {message.role === 'assistant' ? <Bot className="h-5 w-5" /> : 'U'}
                </AvatarFallback>
              </Avatar>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className={`rounded-xl px-4 py-2 whitespace-pre-wrap ${
                  message.role === 'assistant' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}
              >
                {message.content}
              </motion.div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4">
          <form className="flex w-full gap-2" onSubmit={handleSubmit}>
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your PocketBase data..."
              className="dark:bg-gray-700 text-sm md:text-base"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading} className="whitespace-nowrap">
              {isLoading ? 'Processing...' : t('send')}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </motion.div>
  )
} 