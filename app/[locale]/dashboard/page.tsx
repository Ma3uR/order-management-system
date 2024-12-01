import { getTranslations, setRequestLocale } from 'next-intl/server';
import Dashboard from './Dashboard';

export default async function DashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale);
  await getTranslations('Dashboard');
  
  return <Dashboard />;
}
