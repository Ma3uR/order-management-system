import '@/styles/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/config';
import { Footer } from '@/components/footer';
import { Providers } from '../providers';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let messages;
  try {
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="flex flex-col min-h-screen">
              <div className="fixed top-4 right-4 z-50">
                <ThemeSwitcher />
              </div>
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
