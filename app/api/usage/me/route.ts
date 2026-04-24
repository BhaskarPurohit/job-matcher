import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkQuota } from '@/lib/usage/tracker'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quota = await checkQuota(user.id)

  return NextResponse.json({
    plan:      'free',
    used:      quota.used,
    limit:     quota.limit,
    remaining: quota.remaining,
    allowed:   quota.allowed,
    resetAt:   quota.resetAt,
  })
}
