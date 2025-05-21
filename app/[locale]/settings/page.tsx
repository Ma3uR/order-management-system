import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import SettingsPageClient from '@/app/[locale]/settings/SettingsPageClient';

export default async function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');

  return <SettingsPageClient translations={{ backToDashboard: t('backToDashboard') }} />;
}
