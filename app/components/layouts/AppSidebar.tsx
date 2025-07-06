import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent,
  SidebarTrigger,
  SidebarFooter
} from '@/app/components/shared/ui/sidebar';
import {
  LayoutDashboard,
  ShoppingCart,
  Ban,
  Settings,
  Bot,
  Receipt,
  Calculator,
} from 'lucide-react';
import { ThemeToggle } from '@/app/components/shared/ui/theme-toggle';
import LanguageSwitcher from '@/app/components/shared/ui/LanguageSwitcher';
import { PermissionGate } from '@/app/components/auth/PermissionGate';
import { PERMISSIONS } from '@/app/lib/auth/permissions';

export function AppSidebar() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();

  // Always visible navigation items for authenticated users
  const alwaysVisibleItems = [
    {
      title: t('dashboard'),
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard
    },
    {
      title: t('orders'),
      href: `/${locale}/orders`,
      icon: ShoppingCart
    }
  ];

  // Permission-based navigation items
  const permissionBasedItems = [
    {
      title: t('blacklist'),
      href: `/${locale}/blacklist`,
      icon: Ban,
      permission: PERMISSIONS.BLACKLIST_VIEW
    },
    {
      title: t('aiAssistant'),
      href: `/${locale}/ai-chat`,
      icon: Bot,
      permission: PERMISSIONS.ORDERS_VIEW
    },
    {
      title: t('settings'),
      href: `/${locale}/settings`,
      icon: Settings,
      permission: PERMISSIONS.SETTINGS_VIEW
    }
  ];

  const adminOnlyItems = [
    {
      title: t('expenses'),
      href: `/${locale}/expenses`,
      icon: Receipt,
      adminOnly: true
    },
    {
      title: t('fiscal'),
      href: `/${locale}/fiscal`,
      icon: Calculator,
      adminOnly: true
    }
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:hidden">
          <span className="text-purple-600 font-bold">Balemala</span> Digital
          </h2>
          <SidebarTrigger location="sidebar" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav className="space-y-1 px-2 py-4">
          {/* Always visible items for authenticated users */}
          {alwaysVisibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
              <div className="flex items-center justify-center w-8 h-8">
                <item.icon className="h-6 w-6" />
              </div>
              <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
            </Link>
          ))}
          
          {/* Permission-based navigation items */}
          {permissionBasedItems.map((item) => (
            <PermissionGate key={item.href} permission={item.permission}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
              </Link>
            </PermissionGate>
          ))}
          
          {/* Admin-only navigation items */}
          {adminOnlyItems.map((item) => (
            <PermissionGate 
              key={item.href} 
              adminOnly={item.adminOnly}
            >
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <div className="flex items-center justify-center w-8 h-8">
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="group-data-[state=collapsed]:hidden">{item.title}</span>
              </Link>
            </PermissionGate>
          ))}
        </nav>
      </SidebarContent>
      
      {/* Language and Theme Controls */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t mt-auto group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:px-2">
        <div className="group-data-[state=collapsed]:hidden">
          <LanguageSwitcher />
        </div>
        <ThemeToggle className="group-data-[state=collapsed]:mx-0" />
      </div>
      
      <SidebarFooter />
    </Sidebar>
  );
} 