import 'server-only'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Pricing (Claude Haiku — matches what the app uses)
// Update if model changes.  Values are USD per 1 000 tokens.
// ─────────────────────────────────────────────────────────────────────────────
export const COST_PER_1K_TOKENS = {
  input:  0.000003,   // $0.000003 / 1k input tokens  (Haiku)
  output: 0.000015,   // $0.000015 / 1k output tokens (Haiku)
} as const

function calcCost(promptTokens: number, completionTokens: number): number {
  const inputCost  = (promptTokens    / 1000) * COST_PER_1K_TOKENS.input
  const outputCost = (completionTokens / 1000) * COST_PER_1K_TOKENS.output
  // Round to 6 decimal places — matches NUMERIC(10,6) column
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}

// ─────────────────────────────────────────────────────────────────────────────
// Quota check
// ─────────────────────────────────────────────────────────────────────────────
export interface QuotaStatus {
  allowed:   boolean
  used:      number
  limit:     number
  remaining: number
  resetAt:   string
}

export async function checkQuota(userId: string): Promise<QuotaStatus> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('usage_quotas')
    .select('analyses_used, analyses_limit, reset_at')
    .eq('user_id', userId)
    .single()

  // If no row yet (e.g. pre-existing user before trigger was added),
  // upsert a fresh quota row and treat as allowed.
  if (error || !data) {
    await supabase.from('usage_quotas').upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    return { allowed: true, used: 0, limit: 5, remaining: 5, resetAt: nextMonthStart() }
  }

  const used      = data.analyses_used  as number
  const limit     = data.analyses_limit as number
  const resetAt   = data.reset_at       as string
  const remaining = Math.max(0, limit - used)

  return { allowed: remaining > 0, used, limit, remaining, resetAt }
}

// ─────────────────────────────────────────────────────────────────────────────
// Increment analyses_used counter (call after a successful analysis)
// ─────────────────────────────────────────────────────────────────────────────
export async function incrementUsage(userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('increment_analyses_used', { p_user_id: userId })

  if (error) {
    // Fallback: manual read-modify-write (if RPC doesn't exist yet)
    const { data } = await supabase
      .from('usage_quotas')
      .select('analyses_used')
      .eq('user_id', userId)
      .single()

    await supabase
      .from('usage_quotas')
      .update({
        analyses_used: ((data?.analyses_used as number) ?? 0) + 1,
        updated_at:    new Date().toISOString(),
      })
      .eq('user_id', userId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Log a single AI call to usage_logs
// ─────────────────────────────────────────────────────────────────────────────
export interface TokenCounts {
  prompt:     number
  completion: number
}

export async function logUsage(
  userId:     string,
  analysisId: string | null,
  tokens:     TokenCounts,
  model:      string,
): Promise<void> {
  const supabase = createClient()
  const costUsd  = calcCost(tokens.prompt, tokens.completion)

  const { error } = await supabase.from('usage_logs').insert({
    user_id:           userId,
    analysis_id:       analysisId,
    prompt_tokens:     tokens.prompt,
    completion_tokens: tokens.completion,
    cost_usd:          costUsd,
    model,
  })

  if (error) {
    // Non-fatal — log to server console but never throw.
    // A logging failure must never break the user's analysis response.
    console.error('[usage] logUsage insert error:', error.message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function nextMonthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}
