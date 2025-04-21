import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  // Check for PocketBase auth cookie
  const cookieStore = cookies();
  const authCookie = cookieStore.get('pb_auth');
  
  // Redirect based on authentication status
  if (authCookie) {
    redirect(`/${locale}/dashboard`);
  } else {
    redirect(`/${locale}/login`);
  }
} 