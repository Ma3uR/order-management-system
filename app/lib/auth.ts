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
      if (url.startsWith("/")) {
        if (url === '/auth/signin') {
          return `${baseUrl}/dashboard`;
        }
        return `${baseUrl}${url}`;
      }
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return `${baseUrl}/dashboard`;
    },
    async session({ session }) {
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  }
}; 