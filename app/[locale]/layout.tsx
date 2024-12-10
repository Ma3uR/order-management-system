import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Providers } from '../providers'
import { locales } from '@/config'
import { unstable_setRequestLocale } from 'next-intl/server'

const inter = Inter({ subsets: ['latin'] })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  // Validate locale
  if (!locales.includes(locale as any)) notFound()
  
  // Set locale for server components
  unstable_setRequestLocale(locale)

  let messages
  try {
    messages = await getMessages(locale)
  } catch (error) {
    notFound()
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <div className="flex flex-col min-h-screen">
              {children}
            </div>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  )
}
