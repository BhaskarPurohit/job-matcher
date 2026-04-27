import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Pro plan: ₹499/month = 49900 paise
const PRO_AMOUNT_PAISE = 49900

export async function POST() {
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
}
