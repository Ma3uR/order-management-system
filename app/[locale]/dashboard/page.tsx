'use client';

import { useTranslations } from 'next-intl';
import Dashboard from '../../components/features/dashboard/Dashboard';
import { useAuth } from '@/app/hooks/useAuth';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  
  // Client-side authentication check
  const { isLoading, isAuthenticated } = useAuth({ required: true });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{t('redirecting') || 'Redirecting to login...'}</p>
      </div>
    );
  }
  
  return <Dashboard />;
}
