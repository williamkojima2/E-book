import { after, NextResponse } from 'next/server'
import { orderFromAmount } from '@/lib/meta'
import { sendPurchaseCapi } from '@/lib/server/meta-capi'
import { appUrlFrom, clip } from '@/lib/server/request'
import { consultTransaction } from '@/lib/server/xpag'

export const runtime = 'nodejs'

/**
 * Sin base de datos: el estado se consulta en vivo en XPag. Al confirmarse el pago enviamos el Purchase por CAPI.
 * Nunca confiamos en el cuerpo del webhook: el pago se verifica en XPag (estado, monto y moneda).
 * Los datos de atribución (email hasheado, fbp, fbc, ip, ua, origen) viajan en la query de webhook_url.
 */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const nested = (payload?.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>
  const txCandidate = payload?.transaction_id ?? nested.transaction_id ?? payload?.id ?? nested.id
  const txId = typeof txCandidate === 'string' && txCandidate.length > 0 ? txCandidate : null
  console.log('[checkout] webhook XPag', JSON.stringify(payload).slice(0, 600))

  // El estado real se verifica en XPag, así que no dependemos del nombre del estado en el cuerpo.
  if (txId) {
    const q = new URL(req.url).searchParams
    const sourceUrl = `${appUrlFrom(req)}/gracias`
    after(async () => {
      try {
        const tx = await consultTransaction(txId)
        if (tx.status !== 'confirmed' || (tx.currency && tx.currency !== 'COP')) return
        const order = orderFromAmount(Math.round(tx.amount))
        if (!order) {
          console.error('[meta-capi] Monto sin oferta conocida', txId, tx.amount)
          return
        }
        await sendPurchaseCapi({
          paymentId: txId,
          ...order,
          origin: clip(q.get('o'), 20),
          user: {
            emailHash: /^[a-f0-9]{64}$/.test(q.get('em') ?? '') ? (q.get('em') as string) : undefined,
            fbp: clip(q.get('fbp') ?? undefined),
            fbc: clip(q.get('fbc') ?? undefined, 300),
            ip: clip(q.get('ip') ?? undefined, 64),
            ua: clip(q.get('ua') ?? undefined, 400),
          },
          sourceUrl,
        })
      } catch (e) {
        console.error('[meta-capi] webhook', txId, e)
      }
    })
  }
  return NextResponse.json({ ok: true })
}
