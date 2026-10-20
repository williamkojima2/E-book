import { NextResponse } from 'next/server'
import { CHECKOUT_CONFIG } from '@/lib/config'
import { sendBrowserEventCapi } from '@/lib/server/meta-capi'
import { appUrlFrom } from '@/lib/server/request'

const EVENT_ID = /^ic_[0-9a-f-]{36}$/
const ORIGIN = /^[a-z0-9_-]{1,40}$/i

export async function POST(req: Request) {
  let body: { eventId?: unknown; value?: unknown; origin?: unknown; path?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const eventId = typeof body.eventId === 'string' && EVENT_ID.test(body.eventId) ? body.eventId : null
  const value = typeof body.value === 'number' && Number.isFinite(body.value) && body.value > 0 && body.value < 10_000_000 ? body.value : null
  if (!eventId || !value) return NextResponse.json({ ok: false }, { status: 400 })

  const origin = typeof body.origin === 'string' && ORIGIN.test(body.origin) ? body.origin : null
  const path = typeof body.path === 'string' && body.path.startsWith('/') ? body.path.slice(0, 300) : '/'

  await sendBrowserEventCapi({
    eventName: 'InitiateCheckout',
    eventId,
    customData: { value, currency: 'COP', content_name: CHECKOUT_CONFIG.productName },
    origin,
    headers: req.headers,
    sourceUrl: `${appUrlFrom(req)}${path}`,
  })

  return NextResponse.json({ ok: true })
}
