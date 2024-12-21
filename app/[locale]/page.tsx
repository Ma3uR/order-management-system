import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { auth } from '@/app/lib/auth';
import { setRequestLocale } from 'next-intl/server';

export default async function Page({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  
  const session = await getServerSession(auth);

  // Redirect based on authentication status
  if (session) {
    redirect(`/${locale}/dashboard`);
  } else {
    redirect(`/${locale}/auth/signin`);
  }
} 