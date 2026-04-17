'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function OAuthButton({
  provider,
  label,
  icon,
  onClick,
  loading,
}: {
  provider: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  loading: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 h-10 px-4 rounded-lg border border-border bg-bg text-sm text-zinc-300 hover:bg-surface hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {loading ? `Connecting…` : label}
    </button>
  )
}

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z" fill="#FFC107"/>
    <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.6 5.1 29.6 3 24 3c-7.9 0-14.7 4.4-18.7 10.7z" fill="#FF3D00"/>
    <path d="M24 45c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.6 35.9 26.9 37 24 37c-5.8 0-10.6-3.9-11.7-9.3l-6.9 5.4C9.5 40.7 16.2 45 24 45z" fill="#4CAF50"/>
    <path d="M44.5 20H24v8.5h11.8c-.9 2.7-2.6 5-4.9 6.6l6.6 5.6C41.3 37.1 45 31 45 24c0-1.4-.1-2.7-.5-4z" fill="#1976D2"/>
  </svg>
)

const GitHubIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setOauthLoading(null)
    }
    // On success Supabase redirects the browser — no further action needed
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link href="/" className="text-accent font-mono font-bold text-xl tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          match//ai
        </Link>
        <p className="text-muted text-sm mt-2">Sign in to your account</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        {/* OAuth buttons */}
        <div className="space-y-2">
          <OAuthButton
            provider="google"
            label="Continue with Google"
            icon={GoogleIcon}
            onClick={() => handleOAuth('google')}
            loading={oauthLoading === 'google'}
          />
          <OAuthButton
            provider="github"
            label="Continue with GitHub"
            icon={GitHubIcon}
            onClick={() => handleOAuth('github')}
            loading={oauthLoading === 'github'}
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium uppercase tracking-wider">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium uppercase tracking-wider">Password</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/50"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-black font-semibold"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-accent hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
