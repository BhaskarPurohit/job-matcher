'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Check, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const PRO_FEATURES = [
  'Unlimited resume analyses',
  'Full AI + keyword hybrid scoring',
  'Skill gap analysis & suggestions',
  'Tailored resume summary',
  'Full analysis history',
  'Priority support',
]

// Minimal Razorpay types — avoids a separate @types package
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void }
  }
}
interface RazorpayOptions {
  key:         string
  amount:      number
  currency:    string
  order_id:    string
  name:        string
  description: string
  theme?:      { color?: string }
  handler:     (response: RazorpayResponse) => void
  modal?:      { ondismiss?: () => void }
}
interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
}

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  // Load checkout.js once on mount — never re-run, never re-append
  useEffect(() => {
    if (document.getElementById('razorpay-checkout-js')) {
      setScriptReady(true)
      return
    }
    const script  = document.createElement('script')
    script.id     = 'razorpay-checkout-js'
    script.src    = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async  = true
    script.onload = () => setScriptReady(true)
    document.body.appendChild(script)
  }, [])

  async function handleUpgrade() {
    if (!scriptReady) {
      setError('Payment script not loaded yet. Please wait a moment and try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: create order server-side
      const orderRes  = await fetch('/api/razorpay/create-order', { method: 'POST' })
      const orderData = await orderRes.json() as { order_id?: string; amount?: number; currency?: string; error?: string }

      if (!orderRes.ok || !orderData.order_id) {
        setError(orderData.error ?? 'Failed to create order. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: open Razorpay modal
      const rzp = new window.Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount:      orderData.amount!,
        currency:    orderData.currency!,
        order_id:    orderData.order_id,
        name:        'match//ai',
        description: 'Pro Plan — Unlimited Analyses',
        theme:       { color: '#22C55E' },
        modal: {
          ondismiss: () => setLoading(false),
        },
        handler: async (response) => {
          // Step 3: verify signature server-side before granting access
          const verifyRes  = await fetch('/api/razorpay/verify-payment', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(response),
          })
          const verifyData = await verifyRes.json() as { success?: boolean; error?: string }

          if (verifyData.success) {
            router.push('/dashboard?upgraded=1')
          } else {
            setError(verifyData.error ?? 'Payment verification failed. Contact support.')
            setLoading(false)
          }
        },
      })

      rzp.open()
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-zinc-100 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-8 space-y-8">

          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-dim mb-2">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Upgrade to Pro</h1>
            <p className="text-sm text-muted">Unlimited analyses. No monthly cap.</p>
          </div>

          <div className="text-center">
            <span className="text-4xl font-bold text-zinc-100">₹499</span>
            <span className="text-muted text-sm"> / month</span>
          </div>

          <ul className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-accent shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <button
            onClick={handleUpgrade}
            disabled={loading || !scriptReady}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-black font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing…' : !scriptReady ? 'Loading…' : 'Upgrade now →'}
          </button>

          <p className="text-center text-[11px] text-muted">
            Secure payment via Razorpay. UPI, cards, netbanking accepted.
          </p>
        </div>
      </div>
    </div>
  )
}
