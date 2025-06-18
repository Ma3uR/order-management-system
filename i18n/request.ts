import { getRequestConfig } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  
  if (!locale) {
    throw new Error('Locale not found');
  }
  
  setRequestLocale(locale);
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 