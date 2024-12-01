import { setRequestLocale } from 'next-intl/server';
import SettingsPage from './SettingsPage';
import { Footer } from '@/components/footer';

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <SettingsPage />
      </div>
      <Footer />
    </div>
  );
}
