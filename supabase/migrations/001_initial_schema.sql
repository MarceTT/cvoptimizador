-- CVOptimizador Initial Schema
-- Run this migration to create the core tables and RLS policies

-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  trial_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_users_email ON users(email);

-- optimizations table
CREATE TABLE optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  original_cv_text TEXT NOT NULL,
  job_description TEXT NOT NULL,
  optimized_cv_json JSONB,
  score_before INT,
  score_after INT,
  keywords_added TEXT[],
  pdf_storage_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
CREATE INDEX idx_opt_user ON optimizations(user_id);
CREATE INDEX idx_opt_expires ON optimizations(expires_at) WHERE pdf_storage_path IS NOT NULL;

-- payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimization_id UUID REFERENCES optimizations(id),
  amount INT NOT NULL DEFAULT 2990,
  currency TEXT DEFAULT 'CLP',
  webpay_token TEXT UNIQUE,
  webpay_order TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX idx_pay_opt ON payments(optimization_id);
CREATE INDEX idx_pay_status ON payments(status) WHERE status = 'pending';

-- rate_limits table (soft storage, Redis alternative)
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read/update their own record
CREATE POLICY users_self ON users 
  FOR ALL 
  USING (auth.uid() = id);

-- Users can only access their own optimizations
CREATE POLICY opt_owner ON optimizations 
  FOR ALL 
  USING (user_id = auth.uid());

-- Users can only access payments for their optimizations
CREATE POLICY pay_owner ON payments 
  FOR ALL 
  USING (
    optimization_id IN (
      SELECT id FROM optimizations WHERE user_id = auth.uid()
    )
  );

-- Service role bypass for backend operations
CREATE POLICY users_service ON users
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY opt_service ON optimizations
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY pay_service ON payments
  FOR ALL
  TO service_role
  USING (true);
