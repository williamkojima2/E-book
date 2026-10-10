import { after, NextResponse } from 'next/server'
import { sendPurchaseFromBuyer } from '@/lib/server/meta-capi'
import { paymentStatus, verifyOrder } from '@/lib/server/order-token'
import { appUrlFrom } from '@/lib/server/request'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const claim = verifyOrder(new URL(req.url).searchParams.get('t'))
  if (!claim) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const { status } = await paymentStatus(claim)
    if (status === 'paid') {
      const headers = new Headers(req.headers)
      const sourceUrl = `${appUrlFrom(req)}/gracias`
      after(() => sendPurchaseFromBuyer(claim, headers, sourceUrl).catch((e) => console.error('[meta-capi] order-status', e)))
    }
    return NextResponse.json({ ok: true, status }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[checkout] order-status', claim.ref, e)
    return NextResponse.json({ ok: true, status: 'pending' }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
