import Link from 'next/link';
import { useTranslations } from 'next-intl';
import DashboardWrapper from './DashboardWrapper';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import ThemeSwitcher from '@/app/components/ThemeSwitcher';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Dashboard');

  return (
    <DashboardWrapper>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        <nav className="w-64 bg-white dark:bg-gray-800 shadow-lg">
          <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('navigation')}</h2>
          </div>
          <ul className="space-y-2 p-4">
            <li>
              <Link href="/dashboard" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                {t('dashboard')}
              </Link>
            </li>
            <li>
              <Link href="/orders" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                {t('orders')}
              </Link>
            </li>
            <li>
              <Link href="/blacklist" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                {t('blacklist')}
              </Link>
            </li>
            <li>
              <Link href="/settings" className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                {t('settings')}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex-1 flex flex-col">
          <header className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex justify-end items-center px-6 py-3">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </DashboardWrapper>
  );
}
