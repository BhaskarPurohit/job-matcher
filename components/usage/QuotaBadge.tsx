import { createClient } from '@/lib/supabase/server'
import { checkQuota } from '@/lib/usage/tracker'
import { cn } from '@/lib/utils'

/**
 * Server component — renders inline quota pill.
 * Suitable for the sidebar footer or dashboard top bar.
 */
export async function QuotaBadge() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const quota = await checkQuota(user.id)
  const { used, limit, remaining } = quota
  const pct = Math.round((used / limit) * 100)

  const barColor =
    remaining === 0  ? 'bg-danger'
    : remaining <= 1 ? 'bg-warning'
    : 'bg-accent'

  const textColor =
    remaining === 0  ? 'text-danger'
    : remaining <= 1 ? 'text-warning'
    : 'text-muted'

  return (
    <div className="px-3 pb-3">
      <div className="bg-bg border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted font-medium">Free plan</span>
          <span className={cn('text-[11px] font-mono font-bold', textColor)}>
            {remaining}/{limit} left
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {remaining === 0 && (
          <p className="text-[10px] text-danger leading-tight">
            Quota reached. Upgrade for unlimited analyses.
          </p>
        )}
        {remaining === 1 && (
          <p className="text-[10px] text-warning leading-tight">
            1 analysis remaining this month.
          </p>
        )}
      </div>
    </div>
  )
}
