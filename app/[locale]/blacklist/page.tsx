import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import dynamic from 'next/dynamic';
import { auth } from '@/lib/auth';

const BlacklistManagement = dynamic(() => import('@/components/BlacklistManagement'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading...</div>
});

export default async function BlacklistPage() {
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
