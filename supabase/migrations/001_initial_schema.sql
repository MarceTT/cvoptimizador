-- CVOptimizador Initial Schema
-- Compatible with PostgreSQL (Docker) and Supabase

-- users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  trial_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- optimizations table
CREATE TABLE IF NOT EXISTS optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  original_cv_text TEXT NOT NULL,
  job_description TEXT NOT NULL,
  cargo TEXT,
  empresa TEXT,
  optimized_cv_json JSONB,
  score_before INT,
  score_after INT,
  keywords_added TEXT[],
  keywords_existing TEXT[],
  keywords_missing TEXT[],
  suggestions TEXT[],
  pdf_storage_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
CREATE INDEX IF NOT EXISTS idx_opt_user ON optimizations(user_id);
CREATE INDEX IF NOT EXISTS idx_opt_expires ON optimizations(expires_at) WHERE pdf_storage_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opt_status ON optimizations(status);

-- payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id UUID REFERENCES optimizations(id),
  user_id UUID REFERENCES users(id),
  amount INT NOT NULL DEFAULT 2990,
  currency TEXT DEFAULT 'CLP',
  webpay_token TEXT,
  webpay_order TEXT,
  status TEXT DEFAULT 'pending',
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pay_opt ON payments(optimization_id);
CREATE INDEX IF NOT EXISTS idx_pay_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pay_status ON payments(status) WHERE status = 'pending';

-- rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Note: RLS policies are Supabase-specific
-- For local Docker PostgreSQL, we skip RLS and handle auth in the application layer
