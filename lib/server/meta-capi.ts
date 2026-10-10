import 'server-only'
import { createHash } from 'node:crypto'
import { META_ORIGIN_PIXELS, META_PIXEL_ID } from '@/lib/config'
import { pixelsForOrigin, purchaseCustomData, purchaseEvents } from '@/lib/meta'
import type { Offer } from '@/lib/pricing'

const GRAPH_VERSION = 'v23.0'

export const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

/** Token por pixel. Sin token, ese pixel solo recibe los eventos del navegador. */
function tokenFor(pixelId: string) {
  if (pixelId === META_PIXEL_ID) return process.env.META_CAPI_TOKEN
  const origin = Object.keys(META_ORIGIN_PIXELS).find((o) => META_ORIGIN_PIXELS[o] === pixelId)
  return origin ? process.env[`META_CAPI_TOKEN_${origin}`] : undefined
}

export type CapiUser = {
  emailHash?: string
  fbp?: string
  fbc?: string
  ip?: string
  ua?: string
}

function readCookie(cookieHeader: string | null, name: string) {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]).slice(0, 300) : undefined
}

/** Respaldo cuando el webhook no llega: se envía desde la petición del propio comprador (mismo event_id → Meta deduplica). */
export async function sendPurchaseFromBuyer(
  claim: { tx: string; offer: Offer; bump: boolean; email: string },
  headers: Headers,
  sourceUrl: string,
) {
  const cookie = headers.get('cookie')
  await sendPurchaseCapi({
    paymentId: claim.tx,
    offer: claim.offer,
    bump: claim.bump,
    user: {
      emailHash: claim.email ? sha256(claim.email) : undefined,
      fbp: readCookie(cookie, '_fbp'),
      fbc: readCookie(cookie, '_fbc'),
      ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || undefined,
      ua: headers.get('user-agent')?.slice(0, 400) ?? undefined,
    },
    sourceUrl,
  })
}

export async function sendPurchaseCapi(input: {
  paymentId: string
  offer: Offer
  bump: boolean
  origin?: string | null
  user: CapiUser
  sourceUrl: string
}) {
  const now = Math.floor(Date.now() / 1000)
  const data = purchaseEvents(input.paymentId, input.offer, input.bump).map((e) => ({
    event_name: 'Purchase',
    event_time: now,
    event_id: e.eventId,
    action_source: 'website',
    event_source_url: input.sourceUrl,
    user_data: {
      em: input.user.emailHash ? [input.user.emailHash] : undefined,
      external_id: [sha256(input.paymentId)],
      fbp: input.user.fbp,
      fbc: input.user.fbc,
      client_ip_address: input.user.ip,
      client_user_agent: input.user.ua,
    },
    custom_data: purchaseCustomData(e),
  }))

  await Promise.all(
    pixelsForOrigin(input.origin).map(async (pixelId) => {
      const token = tokenFor(pixelId)
      if (!token) return
      try {
        const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data }),
          signal: AbortSignal.timeout(8_000),
        })
        if (!res.ok) console.error('[meta-capi] Purchase rechazado', pixelId, res.status, await res.text())
        else console.log('[meta-capi] Purchase enviado', pixelId, input.paymentId, data.length)
      } catch (e) {
        console.error('[meta-capi] Error enviando Purchase', pixelId, e)
      }
    }),
  )
}
