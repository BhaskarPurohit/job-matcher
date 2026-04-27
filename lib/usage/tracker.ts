import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Claude Haiku token pricing (USD per 1 000 tokens).
// Update manually if the model or Anthropic pricing changes.
export const COST_PER_1K_TOKENS = {
  input:  0.000003,  // $0.000003 / 1k input tokens
  output: 0.000015,  // $0.000015 / 1k output tokens
} as const

function calcCost(promptTokens: number, completionTokens: number): number {
  const inputCost  = (promptTokens    / 1000) * COST_PER_1K_TOKENS.input
  const outputCost = (completionTokens / 1000) * COST_PER_1K_TOKENS.output
  // Round to 6 decimal places — matches NUMERIC(10,6) column in usage_logs
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000
}

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

  if (error || !data) {
    // Row missing — pre-existing user before the trigger was deployed, or DB
    // tables not yet created.  Log the error so it surfaces in server logs,
    // then upsert a fresh row and treat the request as allowed.
    console.error('[usage] checkQuota error for', userId, error?.message ?? 'no data — table may not exist')
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

/**
 * Increment the analyses_used counter for a user.
 *
 * Accepts an optional pre-created Supabase client so this function can be
 * called safely within an active Next.js request context.  If a new client
 * were created here after NextResponse.json() has already been returned, the
 * cookies() store would be torn down and RLS would silently block the UPDATE.
 */
export async function incrementUsage(
  userId:  string,
  client?: SupabaseClient,
): Promise<void> {
  const supabase = client ?? createClient()

  // Preferred path: atomic SQL increment via deployed RPC function.
  const { error: rpcErr } = await supabase.rpc('increment_analyses_used', {
    p_user_id: userId,
  })

  if (!rpcErr) return

  // Fallback: read-modify-write.  Slight race condition under concurrent
  // requests from the same user, but acceptable until the RPC is deployed.
  const { data } = await supabase
    .from('usage_quotas')
    .select('analyses_used')
    .eq('user_id', userId)
    .single()

  const current = (data?.analyses_used as number) ?? 0

  const { error: updateErr } = await supabase
    .from('usage_quotas')
    .update({ analyses_used: current + 1, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (updateErr) {
    console.error('[usage] incrementUsage fallback error:', updateErr.message)
  }
}

export interface TokenCounts {
  prompt:     number
  completion: number
}

/**
 * Append a row to usage_logs for a single AI API call.
 *
 * Non-fatal — a logging failure must never break the user's analysis response.
 * Accepts an optional pre-created client for the same reason as incrementUsage.
 */
export async function logUsage(
  userId:     string,
  analysisId: string | null,
  tokens:     TokenCounts,
  model:      string,
  client?:    SupabaseClient,
): Promise<void> {
  const supabase = client ?? createClient()
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
    console.error('[usage] logUsage insert error:', error.message)
  }
}

function nextMonthStart(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString()
}
