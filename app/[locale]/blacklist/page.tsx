import dynamic from 'next/dynamic';

const BlacklistManagement = dynamic(() => import('@/components/BlacklistManagement'), { ssr: false });

export default function BlacklistPage() {
  return (
    <div className="p-8">
      <BlacklistManagement />
    </div>
  );
}
