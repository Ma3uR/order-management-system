import { setRequestLocale } from 'next-intl/server';
import SettingsPage from './SettingsPage';

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  return <SettingsPage />;
}
