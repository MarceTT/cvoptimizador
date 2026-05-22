/**
 * Rate limiting utilities using Supabase rate_limits table.
 *
 * This is a simple database-backed rate limiter suitable for MVP.
 * For production, consider Redis-based rate limiting for better performance.
 */

import { createAdminClient } from "./supabase";

interface RateLimitRecord {
  key: string;
  count: number;
  window_start: string;
}

/**
 * Check if a request is allowed under rate limits.
 *
 * Uses sliding window approach with database storage.
 *
 * @param key - Unique identifier for the rate limit (e.g., "download:user123")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns true if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  try {
    // Try to get existing rate limit record
    const { data: existing, error: selectError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("key", key)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine
      console.error("Rate limit check error:", selectError);
      return true; // Fail open on errors
    }

    const record = existing as RateLimitRecord | null;

    if (!record) {
      // No record exists - create one
      await supabase.from("rate_limits").insert({
        key,
        count: 1,
        window_start: now.toISOString(),
      });
      return true;
    }

    const recordWindowStart = new Date(record.window_start);

    // Check if the window has expired
    if (recordWindowStart < windowStart) {
      // Window expired - reset counter
      await supabase
        .from("rate_limits")
        .update({
          count: 1,
          window_start: now.toISOString(),
        })
        .eq("key", key);
      return true;
    }

    // Window still active - check count
    if (record.count >= maxRequests) {
      return false; // Rate limited
    }

    // Increment counter
    await supabase
      .from("rate_limits")
      .update({ count: record.count + 1 })
      .eq("key", key);

    return true;
  } catch (error) {
    console.error("Rate limit error:", error);
    return true; // Fail open on errors
  }
}

/**
 * Reset rate limit for a key (useful for testing or admin actions)
 */
export async function resetRateLimit(key: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from("rate_limits").delete().eq("key", key);
}

/**
 * Clean up expired rate limit records.
 *
 * Call this periodically to prevent table bloat.
 * Records older than 1 hour are considered stale.
 */
export async function cleanupRateLimits(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const { count, error } = await supabase
    .from("rate_limits")
    .delete()
    .lt("window_start", cutoff.toISOString());

  if (error) {
    console.error("Rate limit cleanup error:", error);
    return 0;
  }

  return count ?? 0;
}
