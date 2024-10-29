import Link from 'next/link';
import { useTranslations } from 'next-intl';
import DashboardWrapper from './DashboardWrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Dashboard');

  return (
    <DashboardWrapper>
      <div className="flex h-screen bg-gray-100">
        <nav className="w-64 bg-white shadow-lg">
          <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('navigation')}</h2>
          </div>
          <ul className="space-y-2 p-4">
            <li>
              <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-200 rounded">
                {t('dashboard')}
              </Link>
            </li>
            <li>
              <Link href="/orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-200 rounded">
                {t('orders')}
              </Link>
            </li>
            <li>
              <Link href="/blacklist" className="block px-4 py-2 text-gray-700 hover:bg-gray-200 rounded">
                {t('blacklist')}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="block px-4 py-2 text-gray-700 hover:bg-gray-200 rounded">
                {t('settings')}
              </Link>
            </li>
          </ul>
        </nav>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </DashboardWrapper>
  );
}
