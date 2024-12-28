import { getTranslations, setRequestLocale } from 'next-intl/server';
import Dashboard from '../../components/features/dashboard/Dashboard';

export default async function DashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale);
  await getTranslations('Dashboard');
  
  return <Dashboard />;
}
