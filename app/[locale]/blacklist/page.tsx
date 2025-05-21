import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import BlacklistPageClient from './BlacklistPageClient';

export default async function BlacklistPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');

  return <BlacklistPageClient translations={{ backToDashboard: t('backToDashboard') }} />;
}
