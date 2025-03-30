import { Metadata } from 'next';
import { useTranslations } from 'next-intl';

import { AiChatBox } from '@/app/components/features/dashboard/AiChatBox';
import { PageHeader } from '@/app/components/shared/ui/page-header';

export const metadata: Metadata = {
  title: 'AI Chat Assistant',
  description: 'AI-powered assistant for order management system',
};

export default function AiChatPage() {
  const t = useTranslations('AiChat');
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        heading={t('title')}
        subheading={t('pageDescription') || "Chat with our AI assistant for help with orders, reports, and system questions."}
      />
      
      <div className="max-w-4xl mx-auto">
        <AiChatBox />
      </div>
    </div>
  );
} 