import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sendMetaEvent } from '@/lib/server/meta-capi'
import { clientIp, clip } from '@/lib/server/request'

export const runtime = 'nodejs'

const ALLOWED_EVENTS = new Set(['InitiateCheckout', 'AddPaymentInfo'])

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const eventName = clip(body?.eventName, 40)
  const eventId = clip(body?.eventId, 80)
  if (!eventName || !ALLOWED_EVENTS.has(eventName) || !eventId) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const value = typeof body?.value === 'number' && body.value > 0 && body.value < 10_000_000 ? body.value : undefined
  const jar = await cookies()

  const result = await sendMetaEvent({
    eventName,
    eventId,
    eventSourceUrl: clip(body?.url, 500),
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent') ?? undefined,
    fbp: jar.get('_fbp')?.value,
    fbc: jar.get('_fbc')?.value,
    customData: {
      currency: 'COP',
      value,
      content_name: clip(body?.contentName, 100),
      payment_type: clip(body?.paymentType, 20),
    },
  })

  return NextResponse.json(result)
}
