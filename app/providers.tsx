'use client';

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/app/components/layouts/providers/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem={true}
        disableTransitionOnChange={true}
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
