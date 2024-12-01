import NextAuth from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

const handler = NextAuth(authOptions);
export const GET = handler;
export const POST = handler;
