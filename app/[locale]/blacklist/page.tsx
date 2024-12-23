import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { auth } from '@/app/lib/auth';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import BlacklistPageClient from './BlacklistPageClient';

export default async function BlacklistPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');

  const session = await getServerSession(auth);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <BlacklistPageClient translations={{ backToDashboard: t('backToDashboard') }} />;
}
