-- supabase/migrations/004_add_payment_columns.sql
-- Adds payment-provider columns to usage_quotas so a Stripe/Razorpay customer
-- can be linked back to the Supabase user without a separate join table.
-- These columns are optional (nullable) — existing rows are unaffected.

ALTER TABLE usage_quotas
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Enforce uniqueness so two users can never share the same Stripe customer.
CREATE UNIQUE INDEX IF NOT EXISTS usage_quotas_stripe_customer_id_idx
  ON usage_quotas(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
