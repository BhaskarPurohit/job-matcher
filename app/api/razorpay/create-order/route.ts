import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

// Pro plan: ₹499/month = 49900 paise
const PRO_AMOUNT_PAISE = 49900

export async function POST() {
  // Validate env vars inside the handler — not at module level — so a missing
  // key returns a clear 500 instead of crashing the entire module on import.
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[razorpay] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set')
    return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: quota } = await supabase
    .from('usage_quotas')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  if (quota?.plan === 'pro') {
    return NextResponse.json({ error: 'Already on Pro plan' }, { status: 400 })
  }

  // Instantiate inside the handler so missing env vars don't crash the module
  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  try {
    const order = await razorpay.orders.create({
      amount:   PRO_AMOUNT_PAISE,
      currency: 'INR',
      receipt:  `rcpt_${user.id.slice(0, 16)}`,
    })

    return NextResponse.json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[razorpay] create-order failed:', message)
    return NextResponse.json({ error: 'Payment service error. Please try again.' }, { status: 502 })
  }
}
