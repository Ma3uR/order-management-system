import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import pb, { getPocketBase } from "@/lib/pocketbase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const pb = getPocketBase();
          const authData = await pb.collection('users').authWithPassword(
            credentials?.email || '',
            credentials?.password || ''
          );
          
          return {
            id: authData.record.id,
            email: authData.record.email,
            role: authData.record.role
          };
        } catch (error) {
          return null;
        }
      }
    })
  ],
} 