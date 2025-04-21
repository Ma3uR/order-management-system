import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import BlacklistPageClient from './BlacklistPageClient';

export default async function BlacklistPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');
  
  // Check for PocketBase auth cookie
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');

  if (!authCookie) {
    redirect(`/${locale}/login`);
  }

  return <BlacklistPageClient translations={{ backToDashboard: t('backToDashboard') }} />;
}
