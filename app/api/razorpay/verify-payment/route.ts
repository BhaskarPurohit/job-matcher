import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const PRO_ANALYSES_LIMIT = 999

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    razorpay_order_id:   string
    razorpay_payment_id: string
    razorpay_signature:  string
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
  }

  // Verify HMAC-SHA256 signature
  const expectedSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  // Upgrade user to Pro
  const { error } = await supabase
    .from('usage_quotas')
    .update({
      plan:            'pro',
      analyses_limit:  PRO_ANALYSES_LIMIT,
      updated_at:      new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) {
    console.error('[razorpay] Failed to upgrade user:', error.message)
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
