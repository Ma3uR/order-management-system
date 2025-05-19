import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['en', 'ua'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  try {
    // Load messages for the requested locale
    const messages = (await import(`./messages/${locale}.json`)).default;
    return { messages };
  } catch (error) {
    console.error(`Could not load messages for locale: ${locale}`, error);
    // Fallback to default messages if there's an error
    return { 
      messages: (await import('./messages/en.json')).default 
    };
  }
});
