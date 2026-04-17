'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { LayoutDashboard, PlusCircle, History, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard },
  { label: 'New Analysis', href: '/analyze', icon: PlusCircle },
  { label: 'History',      href: '/history', icon: History },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const email = user?.email ?? ''
  const initials = email.slice(0, 2).toUpperCase()
  const displayName = email.split('@')[0] ?? 'User'

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg flex flex-col min-h-screen sticky top-0">
      <div className="h-14 flex items-center px-5 border-b border-border">
        <Link href="/" className="text-accent font-mono font-bold text-base tracking-tight hover:opacity-80 transition-opacity" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          match//ai
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              active ? 'bg-accent-dim text-accent font-medium' : 'text-muted hover:text-zinc-100 hover:bg-surface'
            )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface transition-colors cursor-pointer group text-left">
          <Avatar className="w-7 h-7 border border-border">
            <AvatarFallback className="bg-accent-dim text-accent text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {initials || '??'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-100 truncate">{displayName}</p>
            <p className="text-[11px] text-muted truncate">{email}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </aside>
  )
}
