export const locales = ['ua', 'en'] as const;
export const defaultLocale = 'ua' as const;

export type Locale = (typeof locales)[number]; 