import Providers from "@/app/components/layouts/providers/";
import { locales } from '@/config';
import './globals.css';
import { Toaster } from "@/app/components/shared/ui/toaster";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
