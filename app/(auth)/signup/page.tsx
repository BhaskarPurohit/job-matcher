'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-accent font-mono font-bold text-xl tracking-tight mb-8">match//ai</div>
        <div className="bg-surface border border-border rounded-xl p-8">
          <div className="w-12 h-12 bg-accent-dim border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-zinc-100 font-semibold mb-2">Check your email</h2>
          <p className="text-sm text-muted">We sent a confirmation link to <span className="text-zinc-100">{email}</span>. Click it to activate your account.</p>
        </div>
        <p className="text-center text-sm text-muted mt-4">
          <Link href="/login" className="text-accent hover:underline">Back to sign in</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link href="/" className="text-accent font-mono font-bold text-xl tracking-tight">match//ai</Link>
        <p className="text-muted text-sm mt-2">Create your account</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium uppercase tracking-wider">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium uppercase tracking-wider">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted font-medium uppercase tracking-wider">Confirm password</label>
            <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required className="bg-bg border-border text-zinc-100 placeholder:text-muted focus-visible:ring-accent/50" />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger-dim border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent-hover text-black font-semibold">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted mt-4">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
