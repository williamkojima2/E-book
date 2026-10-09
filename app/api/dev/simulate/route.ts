import { NextResponse } from 'next/server'
import { verifyOrder } from '@/lib/server/order-token'
import { isSandbox, type SimulateOutcome, simulate, XPagError } from '@/lib/server/xpag'

export const runtime = 'nodejs'

const OUTCOMES = new Set<SimulateOutcome>(['paid', 'failed', 'expired'])

export async function POST(req: Request) {
  if (!isSandbox) return NextResponse.json({ ok: false }, { status: 404 })
  const body = (await req.json().catch(() => ({}))) as { token?: string; outcome?: SimulateOutcome }
  const claim = verifyOrder(body.token)
  if (!claim || !body.outcome || !OUTCOMES.has(body.outcome)) {
    return NextResponse.json({ ok: false, error: 'token y outcome son obligatorios' }, { status: 400 })
  }
  try {
    await simulate(claim.tx, body.outcome)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof XPagError ? `${e.code}: ${e.message}` : 'Error simulando'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
