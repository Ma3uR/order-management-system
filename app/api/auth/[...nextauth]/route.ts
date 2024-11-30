import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pb from "@/lib/pocketbase";
import { DefaultUser, DefaultSession } from "next-auth"

// Extend the built-in types
declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string
    id: string
  }

  interface Session extends DefaultSession {
    user?: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const authData = await pb.collection('users').authWithPassword(
            credentials.email,
            credentials.password
          );

          return {
            id: authData.record.id,
            email: authData.record.email,
            name: authData.record.name,
            role: authData.record.role || 'USER',
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
