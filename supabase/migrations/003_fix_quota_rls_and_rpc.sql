-- supabase/migrations/003_fix_quota_rls_and_rpc.sql
-- Run this entire file in one go in the Supabase SQL Editor.
-- Creates usage tables, fixes RLS policies, adds atomic increment function,
-- and backfills quota rows for any users created before the trigger existed.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. usage_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_logs (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id       UUID          REFERENCES analyses(id) ON DELETE SET NULL,
  prompt_tokens     INTEGER       NOT NULL DEFAULT 0,
  completion_tokens INTEGER       NOT NULL DEFAULT 0,
  total_tokens      INTEGER       NOT NULL GENERATED ALWAYS AS (prompt_tokens + completion_tokens) STORED,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  model             TEXT          NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx    ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs(created_at DESC);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage logs"    ON usage_logs;
DROP POLICY IF EXISTS "Service role inserts usage logs" ON usage_logs;
DROP POLICY IF EXISTS "Users insert own usage logs"  ON usage_logs;

CREATE POLICY "Users read own usage logs"
  ON usage_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own usage logs"
  ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. usage_quotas
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

DROP POLICY IF EXISTS "Users read own quota"       ON usage_quotas;
DROP POLICY IF EXISTS "Users insert own quota"     ON usage_quotas;
DROP POLICY IF EXISTS "Users update own quota"     ON usage_quotas;
DROP POLICY IF EXISTS "Service role manages quotas" ON usage_quotas;

CREATE POLICY "Users read own quota"
  ON usage_quotas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own quota"
  ON usage_quotas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own quota"
  ON usage_quotas FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-provision trigger for new signups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usage_quotas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_quota ON auth.users;
CREATE TRIGGER on_auth_user_created_quota
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_quota();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Atomic increment RPC (used by incrementUsage in tracker.ts)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_analyses_used(p_user_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.usage_quotas
  SET    analyses_used = analyses_used + 1,
         updated_at    = now()
  WHERE  user_id = p_user_id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Backfill quota rows for users who signed up before this migration
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.usage_quotas (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
