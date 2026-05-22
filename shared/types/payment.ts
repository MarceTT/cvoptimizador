/**
 * Payment creation request
 */
export interface PaymentCreate {
  optimization_id: string;
}

/**
 * WebPay transaction response
 */
export interface WebPayResponse {
  /** Transaction token from WebPay */
  token: string;
  /** Redirect URL to WebPay payment page */
  url: string;
}

/**
 * Payment status values
 */
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "nullified"
  | "failed"
  | "refunded";

/**
 * Payment database record
 */
export interface Payment {
  id: string;
  optimization_id: string;
  /** Amount in CLP cents (default: 2990 = $2.990 CLP) */
  amount: number;
  /** Currency code */
  currency: string;
  /** WebPay transaction token */
  webpay_token: string | null;
  /** WebPay order number */
  webpay_order: string | null;
  status: PaymentStatus;
  /** Idempotency key for duplicate prevention */
  idempotency_key: string;
  created_at: string;
  confirmed_at: string | null;
}

/**
 * WebPay confirmation callback parameters
 */
export interface WebPayCallback {
  token_ws: string;
}
