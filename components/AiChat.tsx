'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from 'next-intl';

export function AiChat() {
  const [message, setMessage] = useState('');
  const t = useTranslations('Dashboard');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Add AI chat functionality here
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 rounded">
        {/* Chat messages will go here */}
      </div>
      
      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
} 