import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { default as dynamicImport } from 'next/dynamic';
import { auth } from '@/lib/auth';
import { setRequestLocale } from 'next-intl/server';

const BlacklistManagement = dynamicImport(() => import('@/components/BlacklistManagement'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading...</div>
});

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ua' }];
}

export default async function BlacklistPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);

  const session = await getServerSession(auth);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="p-8">
      <BlacklistManagement />
    </div>
  );
}
