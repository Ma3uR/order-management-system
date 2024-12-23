import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Sidebar, SidebarHeader, SidebarContent } from '@/app/components/shared/ui/sidebar';
import {
  LayoutDashboard,
  ShoppingCart,
  Ban,
  Settings
} from 'lucide-react';

export function AppSidebar() {
  const t = useTranslations('Dashboard');

  const navItems = [
    {
      title: t('dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      title: t('orders'),
      href: '/orders',
      icon: ShoppingCart
    },
    {
      title: t('blacklist'),
      href: '/blacklist',
      icon: Ban
    },
    {
      title: t('settings'),
      href: '/settings',
      icon: Settings
    }
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">{t('navigation')}</h2>
      </SidebarHeader>
      <SidebarContent>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              <div className="[box-sizing:content-box]">
                <item.icon className="h-6 w-6" />
              </div>
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
} 