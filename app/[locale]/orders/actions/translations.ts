'use server';

import { getTranslations } from 'next-intl/server';

export async function getOrdersFromSourceText(number: string, source: string) {
  const t = await getTranslations('Orders');
  return t('ordersFromSource', { number, source });
}

export async function getOrdersCombinedText(count: number) {
  const t = await getTranslations('Orders');
  return t('ordersCombined', { count });
} 