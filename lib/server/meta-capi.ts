import 'server-only'
import { META_PIXEL_ID } from '@/lib/config'

type MetaEvent = {
  eventName: string
  eventId: string
  eventSourceUrl?: string
  ip?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  customData?: Record<string, unknown>
}

export async function sendMetaEvent(event: MetaEvent) {
  const token = process.env.META_CAPI_TOKEN
  if (!token) return { ok: false, reason: 'missing_token' as const }

  const body = {
    data: [
      {
        event_name: event.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: event.eventId,
        action_source: 'website',
        event_source_url: event.eventSourceUrl,
        user_data: {
          client_ip_address: event.ip,
          client_user_agent: event.userAgent,
          fbp: event.fbp,
          fbc: event.fbc,
        },
        custom_data: event.customData,
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    )
    if (!res.ok) {
      console.log('[meta-capi] error', res.status, (await res.text()).slice(0, 300))
      return { ok: false, reason: 'api_error' as const }
    }
    return { ok: true }
  } catch (err) {
    console.log('[meta-capi] network error', (err as Error).message)
    return { ok: false, reason: 'network' as const }
  }
}
