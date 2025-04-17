import { getRequestConfig } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => {
  setRequestLocale(locale);
  
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
}); 