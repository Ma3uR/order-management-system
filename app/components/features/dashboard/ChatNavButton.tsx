'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/shared/ui/button';
import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

export function ChatNavButton() {
  const t = useTranslations('AiChat');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const handleOpenChat = () => {
    router.push(`/${locale}/chat`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleOpenChat}
      className="flex items-center gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      <span>{t('navButton')}</span>
    </Button>
  );
} 