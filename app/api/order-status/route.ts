import { NextResponse } from 'next/server'
import { paymentStatus, verifyOrder } from '@/lib/server/order-token'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const claim = verifyOrder(new URL(req.url).searchParams.get('t'))
  if (!claim) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const { status } = await paymentStatus(claim)
    return NextResponse.json({ ok: true, status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[checkout] order-status', claim.ref, e)
    return NextResponse.json({ ok: true, status: 'pending' }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
