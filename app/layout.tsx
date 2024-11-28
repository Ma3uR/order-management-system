import { Providers } from './providers';
import { locales, defaultLocale } from '@/config';
import { ThemeSwitcher } from '@/components/theme-switcher';
import './globals.css';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="fixed top-4 right-4 flex items-center gap-2">
            <ThemeSwitcher />
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
