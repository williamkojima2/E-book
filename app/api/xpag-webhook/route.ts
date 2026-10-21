import { after, NextResponse } from 'next/server'
import { orderFromAmount } from '@/lib/meta'
import { sendPurchaseCapi } from '@/lib/server/meta-capi'
import { claimPurchase, releasePurchase } from '@/lib/server/purchase-dedupe'
import { appUrlFrom, clip } from '@/lib/server/request'
import { consultTransaction, normalizeStatus } from '@/lib/server/xpag'

export const runtime = 'nodejs'

const SHA256_RE = /^[a-f0-9]{64}$/

/**
 * Único lugar que envia o Purchase para a Meta.
 * Responde 200 na hora e processa depois (after), para a XPag não reenviar o aviso.
 * Os dados de atribuição (email/telefone em hash, fbp, fbc, ip, ua, origem) vêm na query do webhook_url.
 */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const nested = (payload?.data && typeof payload.data === 'object' ? payload.data : {}) as Record<string, unknown>
  const txCandidate = payload?.transaction_id ?? nested.transaction_id ?? payload?.id ?? nested.id
  const txId = typeof txCandidate === 'string' && txCandidate.length > 0 ? txCandidate : null
  const notifiedStatus = normalizeStatus(payload?.status ?? nested.status)
  console.log('[xpag-webhook] recebido', txId, payload?.status ?? nested.status)

  if (txId && notifiedStatus === 'confirmed') {
    const q = new URL(req.url).searchParams
    const sourceUrl = `${appUrlFrom(req)}/gracias`
    after(() => processPaidWebhook(txId, q, sourceUrl))
  }
  return NextResponse.json({ ok: true })
}

async function processPaidWebhook(txId: string, q: URLSearchParams, sourceUrl: string) {
  try {
    // Nunca confiamos só no corpo do webhook: confirmamos estado, valor e moeda direto na XPag.
    const tx = await consultTransaction(txId)
    if (tx.status !== 'confirmed' || (tx.currency && tx.currency !== 'COP')) return
    const order = orderFromAmount(Math.round(tx.amount))
    if (!order) {
      console.error('[meta-capi] Valor sem oferta conhecida', txId, tx.amount)
      return
    }

    if (!(await claimPurchase(txId))) {
      console.log('[meta-capi] Purchase já enviado, ignorando', txId)
      return
    }

    const sent = await sendPurchaseCapi({
      paymentId: txId,
      ...order,
      origin: clip(q.get('o'), 20),
      user: {
        emailHash: SHA256_RE.test(q.get('em') ?? '') ? (q.get('em') as string) : undefined,
        phoneHash: SHA256_RE.test(q.get('ph') ?? '') ? (q.get('ph') as string) : undefined,
        fbp: clip(q.get('fbp') ?? undefined),
        fbc: clip(q.get('fbc') ?? undefined, 300),
        ip: clip(q.get('ip') ?? undefined, 64),
        ua: clip(q.get('ua') ?? undefined, 400),
      },
      sourceUrl,
    })
    if (!sent) await releasePurchase(txId)
  } catch (e) {
    console.error('[meta-capi] webhook', txId, e)
  }
}
