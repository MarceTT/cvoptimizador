import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import { getOrCreateUser, hasUsedTrial } from "./supabase";
import type { SessionUser } from "@cvoptimizador/types";

if (!process.env.AUTH_SECRET) {
  throw new Error("Missing AUTH_SECRET environment variable");
}

if (!process.env.AUTH_RESEND_KEY) {
  throw new Error("Missing AUTH_RESEND_KEY environment variable");
}

/**
 * NextAuth v5 configuration with magic link authentication
 * Uses Supabase as the database adapter
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "CVOptimizador <noreply@cvoptimizador.cl>",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user }) {
      // Ensure user exists in our users table
      if (user.email) {
        await getOrCreateUser(user.email);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (user?.email) {
        token.email = user.email;
        // Check trial status
        const dbUser = await getOrCreateUser(user.email);
        token.id = dbUser.id;
        token.trial_used = dbUser.trial_used_at !== null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const sessionUser = session.user as SessionUser;
        sessionUser.id = token.id as string;
        sessionUser.email = token.email as string;
        sessionUser.trial_used = (token.trial_used as boolean) ?? false;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      console.log(`User signed in: ${user.email}`);
    },
  },
});

/**
 * Get the current session on the server
 */
export async function getSession() {
  return auth();
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}

/**
 * Get the current user's ID or throw if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Authentication required");
  }
  return session.user as SessionUser;
}

/**
 * Generate a JWT for API authentication
 */
export async function generateApiToken(userId: string, email: string): Promise<string> {
  // This will be implemented when we add API calls to FastAPI
  // For now, we use the session token from NextAuth
  const { encode } = await import("next-auth/jwt");

  return encode({
    token: {
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    },
    secret: process.env.AUTH_SECRET!,
  });
}
