/**
 * User database record
 */
export interface User {
  id: string;
  email: string;
  /** Timestamp when trial was used (null if not used) */
  trial_used_at: string | null;
  created_at: string;
  /** Soft delete timestamp */
  deleted_at: string | null;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  /** User ID (sub claim) */
  sub: string;
  /** User email */
  email: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
}

/**
 * Session user (from NextAuth)
 */
export interface SessionUser {
  id: string;
  email: string;
  /** Whether the user has used their free trial */
  trial_used: boolean;
}
