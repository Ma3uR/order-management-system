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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
      </head>
      <body suppressHydrationWarning className="overflow-x-hidden">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  )
}
