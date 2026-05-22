import { createClient } from "@supabase/supabase-js";
import type { Optimization, Payment, User } from "@cvoptimizador/types";

/**
 * Database schema types for Supabase client
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: {
          email: string;
          trial_used_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          email?: string;
          trial_used_at?: string | null;
          deleted_at?: string | null;
        };
      };
      optimizations: {
        Row: Optimization;
        Insert: Omit<Optimization, "id" | "created_at" | "expires_at">;
        Update: Partial<Omit<Optimization, "id">>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at">;
        Update: Partial<Omit<Payment, "id">>;
      };
      rate_limits: {
        Row: {
          key: string;
          count: number;
          window_start: string;
        };
        Insert: {
          key: string;
          count?: number;
          window_start?: string;
        };
        Update: {
          count?: number;
          window_start?: string;
        };
      };
    };
  };
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
}

/**
 * Supabase client for browser/server components
 * Uses anon key for RLS-protected operations
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Create a Supabase admin client for server-side operations
 * Bypasses RLS for backend tasks
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Helper to get or create a user by email
 */
export async function getOrCreateUser(email: string): Promise<User> {
  const admin = createAdminClient();

  // Try to find existing user
  const { data: existingUser } = await admin
    .from("users")
    .select("*")
    .eq("email", email)
    .is("deleted_at", null)
    .single();

  if (existingUser) {
    return existingUser as User;
  }

  // Create new user
  const { data: newUser, error } = await admin
    .from("users")
    .insert({ email, trial_used_at: null, deleted_at: null })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  if (!newUser) {
    throw new Error("Failed to create user: no data returned");
  }

  return newUser as User;
}

/**
 * Check if user has used their free trial
 */
export async function hasUsedTrial(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("users")
    .select("trial_used_at")
    .eq("id", userId)
    .single();

  const user = data as { trial_used_at: string | null } | null;
  return user?.trial_used_at !== null;
}

/**
 * Mark user's trial as used
 */
export async function markTrialUsed(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("users")
    .update({ trial_used_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to mark trial used: ${error.message}`);
  }
}
