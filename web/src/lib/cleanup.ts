/**
 * Cleanup utilities for expired PDFs and rate limit records.
 *
 * These functions should be called periodically (e.g., via cron job or edge function).
 * For MVP, they can be triggered manually or via an admin endpoint.
 */

import { createAdminClient } from "./supabase";
import { cleanupRateLimits } from "./rate-limit";
import type { Optimization } from "@cvoptimizador/types";

const PDF_RETENTION_DAYS = 7;

interface CleanupResult {
  expiredOptimizations: number;
  deletedPdfs: number;
  cleanedRateLimits: number;
  errors: string[];
}

/**
 * Clean up expired PDFs from Supabase Storage.
 *
 * Finds optimizations with:
 * - pdf_storage_path is set
 * - expires_at is in the past
 *
 * Then deletes the PDF files and clears the storage path reference.
 */
export async function cleanupExpiredPdfs(): Promise<{
  deleted: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  const errors: string[] = [];
  let deleted = 0;

  try {
    // Find expired optimizations with PDFs
    const { data: expiredOpts, error: selectError } = await supabase
      .from("optimizations")
      .select("id, pdf_storage_path")
      .not("pdf_storage_path", "is", null)
      .lt("expires_at", new Date().toISOString());

    if (selectError) {
      errors.push(`Select error: ${selectError.message}`);
      return { deleted: 0, errors };
    }

    if (!expiredOpts || expiredOpts.length === 0) {
      return { deleted: 0, errors };
    }

    // Delete each PDF from storage
    for (const opt of expiredOpts as Pick<Optimization, "id" | "pdf_storage_path">[]) {
      if (!opt.pdf_storage_path) continue;

      try {
        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from("cv-pdfs")
          .remove([opt.pdf_storage_path]);

        if (storageError) {
          errors.push(`Storage delete error for ${opt.id}: ${storageError.message}`);
          continue;
        }

        // Clear the storage path reference
        const { error: updateError } = await supabase
          .from("optimizations")
          .update({ pdf_storage_path: null })
          .eq("id", opt.id);

        if (updateError) {
          errors.push(`Update error for ${opt.id}: ${updateError.message}`);
          continue;
        }

        deleted++;
      } catch (error) {
        errors.push(`Error processing ${opt.id}: ${error}`);
      }
    }

    return { deleted, errors };
  } catch (error) {
    errors.push(`Unexpected error: ${error}`);
    return { deleted: 0, errors };
  }
}

/**
 * Run all cleanup tasks.
 *
 * This is the main entry point for the cleanup job.
 */
export async function runCleanup(): Promise<CleanupResult> {
  const result: CleanupResult = {
    expiredOptimizations: 0,
    deletedPdfs: 0,
    cleanedRateLimits: 0,
    errors: [],
  };

  // 1. Clean up expired PDFs
  const pdfCleanup = await cleanupExpiredPdfs();
  result.deletedPdfs = pdfCleanup.deleted;
  result.errors.push(...pdfCleanup.errors);

  // 2. Clean up rate limit records
  try {
    result.cleanedRateLimits = await cleanupRateLimits();
  } catch (error) {
    result.errors.push(`Rate limit cleanup error: ${error}`);
  }

  // 3. Count expired optimizations (for reporting)
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("optimizations")
      .select("id", { count: "exact", head: true })
      .lt("expires_at", new Date().toISOString());

    result.expiredOptimizations = count ?? 0;
  } catch (error) {
    result.errors.push(`Count error: ${error}`);
  }

  return result;
}

/**
 * Mark pending transactions as failed if they're older than 10 minutes.
 *
 * This handles cases where users abandon the WebPay flow.
 */
export async function expirePendingTransactions(): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

  const { count, error } = await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("status", "pending")
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error("Error expiring pending transactions:", error);
    return 0;
  }

  return count ?? 0;
}
