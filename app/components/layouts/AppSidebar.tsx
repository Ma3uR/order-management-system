import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  Bot
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
      title: t('aiAssistant'),
      href: '/ai-chat',
      icon: Bot
    },
    {
      title: t('settings'),
      href: '/settings',
      icon: Settings
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
          {navItems.map((item) => (
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
        </nav>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
} 