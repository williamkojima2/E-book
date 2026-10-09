import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { computeAmount, isOffer, isPayMethod, type Offer, type PayMethod } from '@/lib/pricing'
import { consultTransaction } from './xpag'

/** Pedido sin base de datos: viaja firmado con HMAC en la URL y la XPag es la fuente de verdad del pago. */
export type OrderClaim = {
  ref: string
  tx: string
  offer: Offer
  bump: boolean
  amount: number
  email: string
  phone: string
  method: PayMethod
  iat: number
}

export type PayStatus = 'pending' | 'paid' | 'expired' | 'failed'

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const PENDING_MAX_MS = 24 * 60 * 60 * 1000

function secret() {
  const explicit = process.env.ORDER_SIGNING_SECRET
  if (explicit) return explicit
  const base = process.env.XPAG_CLIENT_SECRET
  if (base) return createHmac('sha256', base).update('lotesmart-order-token-v1').digest('hex')
  if (process.env.VERCEL_ENV === 'production') throw new Error('Falta XPAG_CLIENT_SECRET para firmar pedidos.')
  return 'lotesmart-dev-only-secret'
}

const sign = (data: string) => createHmac('sha256', secret()).update(data).digest('base64url')

export function signOrder(claim: OrderClaim): string {
  const data = Buffer.from(JSON.stringify(claim)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function verifyOrder(token: string | null | undefined): OrderClaim | null {
  if (!token || token.length > 1200) return null
  const [data, mac] = token.split('.')
  if (!data || !mac) return null
  const expected = Buffer.from(sign(data))
  const got = Buffer.from(mac)
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null
  try {
    const c = JSON.parse(Buffer.from(data, 'base64url').toString()) as OrderClaim
    if (!isOffer(c.offer) || !isPayMethod(c.method) || typeof c.tx !== 'string') return null
    if (c.amount !== computeAmount(c.offer, c.bump)) return null
    if (Date.now() - c.iat > MAX_AGE_MS) return null
    return c
  } catch {
    return null
  }
}

/** Consulta la transacción en XPag y exige monto y moneda correctos antes de considerarla pagada. */
export async function paymentStatus(claim: OrderClaim): Promise<{ status: PayStatus; checkoutUrl: string | null }> {
  const tx = await consultTransaction(claim.tx)
  if (tx.status === 'confirmed') {
    const ok = Math.round(tx.amount) === claim.amount && (!tx.currency || tx.currency === 'COP')
    if (!ok) {
      console.error('[checkout] Confirmación rechazada por monto/moneda', { ref: claim.ref, tx: claim.tx, got: tx.amount })
      return { status: 'pending', checkoutUrl: tx.checkoutUrl }
    }
    return { status: 'paid', checkoutUrl: tx.checkoutUrl }
  }
  if (tx.status === 'expired' || tx.status === 'failed') return { status: tx.status, checkoutUrl: null }
  if (Date.now() - claim.iat > PENDING_MAX_MS) return { status: 'expired', checkoutUrl: null }
  return { status: 'pending', checkoutUrl: tx.checkoutUrl }
}

export async function isPaid(token: string | null | undefined): Promise<OrderClaim | null> {
  const claim = verifyOrder(token)
  if (!claim) return null
  try {
    return (await paymentStatus(claim)).status === 'paid' ? claim : null
  } catch (e) {
    console.error('[checkout] Error consultando pago', claim.ref, e)
    return null
  }
}
