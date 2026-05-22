import { createHash, randomUUID } from "crypto";
import type { PaymentStatus } from "@cvoptimizador/types";

/**
 * WebPay transaction creation parameters
 */
interface CreateTransactionParams {
  /** Amount in CLP */
  amount: number;
  /** Unique order identifier */
  orderId: string;
  /** URL to redirect after payment */
  returnUrl: string;
  /** Session ID for tracking */
  sessionId: string;
}

/**
 * WebPay transaction result
 */
interface TransactionResult {
  /** Transaction token */
  token: string;
  /** Redirect URL to WebPay */
  url: string;
}

/**
 * WebPay confirmation response
 */
export interface WebPayConfirmResponse {
  /** Response code (0 = success) */
  responseCode: number;
  /** Transaction status */
  status: "AUTHORIZED" | "NULLIFIED" | "FAILED" | "TIMEOUT";
  /** Amount charged */
  amount: number;
  /** Authorization code (for successful payments) */
  authorizationCode?: string;
  /** Payment type code */
  paymentTypeCode?: string;
  /** Card last 4 digits */
  cardNumber?: string;
  /** Transaction date */
  transactionDate?: string;
}

/**
 * Environment configuration
 */
const WEBPAY_CONFIG = {
  // In production, these come from Transbank credentials
  commerceCode: process.env.WEBPAY_COMMERCE_CODE || "597055555532",
  apiKey: process.env.WEBPAY_API_KEY || "579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C",
  environment: (process.env.WEBPAY_ENV || "integration") as "integration" | "production",
  baseUrl: process.env.WEBPAY_ENV === "production"
    ? "https://webpay3g.transbank.cl"
    : "https://webpay3gint.transbank.cl",
};

/**
 * Generate an idempotency key for payment creation.
 * Same optimization + user + date window = same key.
 */
export function generateIdempotencyKey(
  optimizationId: string,
  userId: string
): string {
  // Include date to allow retry after midnight
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const input = `${optimizationId}:${userId}:${dateKey}`;
  
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

/**
 * Create a WebPay transaction.
 * In MVP/integration mode, this returns mock data.
 * In production, this calls the actual WebPay API.
 */
export async function createWebPayTransaction(
  params: CreateTransactionParams
): Promise<TransactionResult> {
  const { amount, orderId, returnUrl, sessionId } = params;

  // For MVP, use mock/sandbox mode
  if (WEBPAY_CONFIG.environment === "integration") {
    // Generate a mock token that looks like a real WebPay token
    const mockToken = `01ab${randomUUID().replace(/-/g, "").slice(0, 60)}`;
    
    // Return mock WebPay redirect URL
    // In sandbox, this would go to Transbank's integration environment
    return {
      token: mockToken,
      url: `${WEBPAY_CONFIG.baseUrl}/webpayserver/initTransaction?token_ws=${mockToken}`,
    };
  }

  // Production mode - actual WebPay API call
  // This would use the transbank-sdk in a real implementation
  const response = await fetch(`${WEBPAY_CONFIG.baseUrl}/rswebpaytransaction/api/webpay/v1.2/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Tbk-Api-Key-Id": WEBPAY_CONFIG.commerceCode,
      "Tbk-Api-Key-Secret": WEBPAY_CONFIG.apiKey,
    },
    body: JSON.stringify({
      buy_order: orderId,
      session_id: sessionId,
      amount,
      return_url: returnUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("WebPay create error:", error);
    throw new Error("Error al crear transacción WebPay");
  }

  const data = await response.json();
  
  return {
    token: data.token,
    url: data.url,
  };
}

/**
 * Confirm a WebPay transaction after user returns from payment.
 * In MVP/integration mode, this simulates WebPay responses based on token patterns.
 */
export async function confirmWebPayTransaction(
  token: string
): Promise<WebPayConfirmResponse> {
  // For MVP, simulate different responses based on token patterns
  // This allows testing different flows without real WebPay
  if (WEBPAY_CONFIG.environment === "integration") {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Token patterns for testing different scenarios:
    // - Tokens starting with "fail" → FAILED
    // - Tokens starting with "null" → NULLIFIED (user cancelled)
    // - Tokens starting with "time" → TIMEOUT
    // - All others → AUTHORIZED (success)
    
    if (token.toLowerCase().startsWith("fail")) {
      return {
        responseCode: -1,
        status: "FAILED",
        amount: 0,
      };
    }

    if (token.toLowerCase().startsWith("null")) {
      return {
        responseCode: -2,
        status: "NULLIFIED",
        amount: 0,
      };
    }

    if (token.toLowerCase().startsWith("time")) {
      return {
        responseCode: -3,
        status: "TIMEOUT",
        amount: 0,
      };
    }

    // Default: successful payment
    return {
      responseCode: 0,
      status: "AUTHORIZED",
      amount: 2990,
      authorizationCode: `AUTH${Date.now().toString().slice(-6)}`,
      paymentTypeCode: "VN", // Venta Normal
      cardNumber: "****1234",
      transactionDate: new Date().toISOString(),
    };
  }

  // Production mode - actual WebPay API call
  const response = await fetch(
    `${WEBPAY_CONFIG.baseUrl}/rswebpaytransaction/api/webpay/v1.2/transactions/${token}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Tbk-Api-Key-Id": WEBPAY_CONFIG.commerceCode,
        "Tbk-Api-Key-Secret": WEBPAY_CONFIG.apiKey,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("WebPay confirm error:", error);
    throw new Error("Error al confirmar transacción WebPay");
  }

  const data = await response.json();

  // Map WebPay response to our format
  const status = mapWebPayStatus(data.response_code, data.status);

  return {
    responseCode: data.response_code,
    status,
    amount: data.amount,
    authorizationCode: data.authorization_code,
    paymentTypeCode: data.payment_type_code,
    cardNumber: data.card_detail?.card_number,
    transactionDate: data.transaction_date,
  };
}

/**
 * Map WebPay response codes to our status enum
 */
function mapWebPayStatus(
  responseCode: number,
  tbkStatus?: string
): "AUTHORIZED" | "NULLIFIED" | "FAILED" | "TIMEOUT" {
  if (responseCode === 0) {
    return "AUTHORIZED";
  }
  
  if (tbkStatus === "NULLIFIED" || responseCode === -2) {
    return "NULLIFIED";
  }
  
  if (responseCode === -3 || tbkStatus === "TIMEOUT") {
    return "TIMEOUT";
  }
  
  return "FAILED";
}

/**
 * Map WebPay status to our payment status enum
 */
export function webpayStatusToPaymentStatus(
  webpayStatus: "AUTHORIZED" | "NULLIFIED" | "FAILED" | "TIMEOUT"
): PaymentStatus {
  switch (webpayStatus) {
    case "AUTHORIZED":
      return "authorized";
    case "NULLIFIED":
      return "nullified";
    case "FAILED":
    case "TIMEOUT":
      return "failed";
    default:
      return "failed";
  }
}

/**
 * Check if a pending transaction has expired (10 minute timeout)
 */
export function isTransactionExpired(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = diffMs / 1000 / 60;
  
  return diffMinutes > 10;
}

/**
 * Expire pending transactions older than 10 minutes.
 * This is a utility function - in production, run as a cron job.
 */
export async function expirePendingTransactions(
  supabase: ReturnType<typeof import("./supabase").createAdminClient>
): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .update({ status: "failed" })
    .eq("status", "pending")
    .lt("created_at", tenMinutesAgo)
    .select("id");

  if (error) {
    console.error("Error expiring transactions:", error);
    return 0;
  }

  return data?.length ?? 0;
}
