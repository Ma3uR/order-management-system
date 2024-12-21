'use client';

import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Button } from '@/app/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { Footer } from '@/app/components/footer';
import { ThemeProvider } from 'next-themes';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SessionProvider>
    </ThemeProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 pe-16 py-4 bg-white dark:bg-gray-800">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('navigation')}</h2>
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      <nav className={cn(
        "lg:hidden fixed inset-y-0 left-0 transform bg-white dark:bg-gray-800 w-64 transition-transform duration-300 ease-in-out z-30",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 mt-16">
          <ul className="space-y-2">
            <li>
              <Link 
                href="/dashboard" 
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('dashboard')}
              </Link>
            </li>
            <li>
              <Link 
                href="/orders" 
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('orders')}
              </Link>
            </li>
            <li>
              <Link 
                href="/blacklist" 
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('blacklist')}
              </Link>
            </li>
            <li>
              <Link 
                href="/settings" 
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('settings')}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:block lg:w-64 bg-white dark:bg-gray-800 shadow-lg">
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

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="flex justify-between items-center px-4 py-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gray-100 dark:bg-gray-900">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
