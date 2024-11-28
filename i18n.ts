export const defaultLocale = 'en'
export const locales = ['en', 'ru'] as const

export const localePrefix = 'as-needed'

export type Locale = typeof locales[number]
