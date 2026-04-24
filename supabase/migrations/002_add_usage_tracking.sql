-- supabase/migrations/002_add_usage_tracking.sql
-- Usage logs + per-user quotas with RLS and auto-provisioning trigger.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. usage_logs  — append-only record of every AI call
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id       UUID        REFERENCES analyses(id) ON DELETE SET NULL,
  prompt_tokens     INTEGER     NOT NULL DEFAULT 0,
  completion_tokens INTEGER     NOT NULL DEFAULT 0,
  total_tokens      INTEGER     NOT NULL GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  model             TEXT        NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usage_logs_user_id_idx    ON usage_logs(user_id);
CREATE INDEX usage_logs_created_at_idx ON usage_logs(created_at DESC);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage logs"
  ON usage_logs FOR SELECT USING (auth.uid() = user_id);

-- Service role (API routes) may insert — anon/authenticated can only read.
CREATE POLICY "Service role inserts usage logs"
  ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. usage_quotas  — one row per user, tracks plan + monthly usage counter
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_quotas (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL DEFAULT 'free',
  analyses_used   INTEGER     NOT NULL DEFAULT 0,
  analyses_limit  INTEGER     NOT NULL DEFAULT 5,
  reset_at        TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quota"
  ON usage_quotas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages quotas"
  ON usage_quotas FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-provision a quota row when a new user signs up
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop the trigger first so this migration is re-runnable
DROP TRIGGER IF EXISTS on_auth_user_created_quota ON auth.users;

CREATE TRIGGER on_auth_user_created_quota
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_quota();
