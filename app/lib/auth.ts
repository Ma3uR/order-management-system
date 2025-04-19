import { AuthOptions } from 'next-auth';
import CredentialsProvider from "next-auth/providers/credentials";
import pb from './pocketbase';
import { AxiosError } from 'axios';

export const auth: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const authData = await pb.collection('users').authWithPassword(
            credentials?.email || '',
            credentials?.password || ''
          );
          return authData.record;
        } catch (error: unknown) {
          if (error instanceof AxiosError) {
            console.error(error.message);
          } else {
            console.error(error);
          }
          return null;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Extract the current locale from the URL if present
      const urlObj = new URL(url.startsWith('/') ? `${baseUrl}${url}` : url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const locales = ['en', 'ua'];
      const currentLocale = locales.includes(pathParts[0]) ? pathParts[0] : 'en';
      
      if (url.startsWith("/")) {
        if (url === '/auth/signin') {
          return `${baseUrl}/${currentLocale}/dashboard`;
        }
        // If URL already contains locale, return as is
        if (locales.some(locale => url.startsWith(`/${locale}/`))) {
          return `${baseUrl}${url}`;
        }
        // Add locale to URL if not present
        return `${baseUrl}/${currentLocale}${url}`;
      }
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/${currentLocale}/dashboard`;
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  }
}; 