import { createAdminClient, hasUsedTrial, markTrialUsed } from "./supabase";

/**
 * Trial enforcement result
 */
export interface TrialCheckResult {
  /** Whether the user is eligible for free trial */
  isEligible: boolean;
  /** Whether trial was already used */
  trialUsed: boolean;
  /** Message to show user */
  message?: string;
}

/**
 * Check if user is eligible for free trial.
 * First optimization + verified email = free trial.
 */
export async function checkTrialEligibility(
  userId: string
): Promise<TrialCheckResult> {
  const trialUsed = await hasUsedTrial(userId);

  if (trialUsed) {
    return {
      isEligible: false,
      trialUsed: true,
      message: "Ya usaste tu prueba gratuita",
    };
  }

  // User is eligible for free trial
  return {
    isEligible: true,
    trialUsed: false,
  };
}

/**
 * Consume user's free trial.
 * Call this when user downloads their first optimization.
 */
export async function consumeTrial(userId: string): Promise<void> {
  await markTrialUsed(userId);
}

/**
 * Check if payment is required for an optimization.
 * Returns true if user must pay, false if trial or already paid.
 */
export async function requiresPayment(
  userId: string,
  optimizationId: string
): Promise<{ required: boolean; reason: string }> {
  const supabase = createAdminClient();

  // Check if already paid
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status")
    .eq("optimization_id", optimizationId)
    .eq("status", "authorized")
    .single();

  if (payment) {
    return { required: false, reason: "already_paid" };
  }

  // Check trial eligibility
  const trialCheck = await checkTrialEligibility(userId);
  
  if (trialCheck.isEligible) {
    return { required: false, reason: "trial_eligible" };
  }

  // Payment required
  return { required: true, reason: "trial_used" };
}

/**
 * Get user's trial status for display.
 */
export async function getTrialStatus(userId: string): Promise<{
  used: boolean;
  usedAt: string | null;
}> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("users")
    .select("trial_used_at")
    .eq("id", userId)
    .single();

  const user = data as { trial_used_at: string | null } | null;

  return {
    used: user?.trial_used_at !== null,
    usedAt: user?.trial_used_at ?? null,
  };
}
