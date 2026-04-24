'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface QuotaData {
  used:      number
  limit:     number
  remaining: number
}

export function QuotaBadge() {
  const pathname = usePathname()
  const [quota, setQuota] = useState<QuotaData | null>(null)

  useEffect(() => {
    fetch('/api/usage/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && typeof data.used === 'number') {
          setQuota({ used: data.used, limit: data.limit, remaining: data.remaining })
        }
      })
      .catch(() => null)
  }, [pathname]) // re-fetch on every route change

  if (!quota) return null

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
