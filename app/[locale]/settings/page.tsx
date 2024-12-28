import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { auth } from '@/app/lib/auth';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import SettingsPageClient from '@/app/[locale]/settings/SettingsPageClient';

export default async function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');

  const session = await getServerSession(auth);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return <SettingsPageClient translations={{ backToDashboard: t('backToDashboard') }} />;
}
