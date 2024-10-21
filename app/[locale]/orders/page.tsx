'use client';

import { useTranslations } from 'next-intl';
import OrdersManagement from '@/components/OrdersManagement';

export default function OrdersPage() {
  const t = useTranslations('OrdersManagement');
  return <OrdersManagement t={t} />;
}
