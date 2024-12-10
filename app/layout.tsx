import { Providers } from './providers';
import { locales } from '@/config';
import './globals.css';
import AuthProvider from "@/components/providers/session-provider"

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
