import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Chat Assistant',
  description: 'AI-powered assistant for order management system',
};

export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 