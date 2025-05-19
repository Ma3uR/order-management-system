import { getTranslations, setRequestLocale } from 'next-intl/server';
import Dashboard from '../../components/features/dashboard/Dashboard';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardPage({
  params: { locale }
}: {
  params: { locale: string }
}) {
  setRequestLocale(locale);
  await getTranslations('Dashboard');
  
  // Check for PocketBase auth cookie on the server side
  const cookieStore = cookies();
  // Check for multiple possible cookie names (default is pb_auth, but PocketBase might use others)
  const authCookie = cookieStore.get('pb_auth') || cookieStore.get('PocketBase_auth');
  
  // Log all cookies for debugging
  console.log('Dashboard cookies:', Array.from(cookieStore.getAll()).map(c => c.name));
  
  // If no auth cookie, redirect to login
  if (!authCookie) {
    console.log('No auth cookie found in dashboard page, redirecting to login');
    redirect(`/${locale}/login`);
  }
  
  return <Dashboard />;
}
