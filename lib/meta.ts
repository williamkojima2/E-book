import { CHECKOUT_CONFIG, META_ORIGIN_PIXELS, META_PIXEL_ID, PRICE_BUMP } from '@/lib/config'
import { computeAmount, OFFER_PRICES, type Offer } from '@/lib/pricing'

export const META_PRODUCTS = {
  main: { id: 'lotesmart-colombia', name: CHECKOUT_CONFIG.productName },
  bump: { id: 'bonos-lotesmart', name: CHECKOUT_CONFIG.bumpName },
} as const

export type PurchaseEvent = {
  eventId: string
  productId: string
  name: string
  value: number
  plan: string
}

/** Un evento por producto (principal y bump separados), con eventID estable por pago/producto para deduplicar. */
export function purchaseEvents(paymentId: string, offer: Offer, bump: boolean): PurchaseEvent[] {
  const events: PurchaseEvent[] = [
    {
      eventId: `purchase_${paymentId}_${META_PRODUCTS.main.id}`,
      productId: META_PRODUCTS.main.id,
      name: META_PRODUCTS.main.name,
      value: OFFER_PRICES[offer],
      plan: offer,
    },
  ]
  if (bump) {
    events.push({
      eventId: `purchase_${paymentId}_${META_PRODUCTS.bump.id}`,
      productId: META_PRODUCTS.bump.id,
      name: META_PRODUCTS.bump.name,
      value: PRICE_BUMP,
      plan: 'bump',
    })
  }
  return events
}

export function purchaseCustomData(e: PurchaseEvent) {
  return {
    currency: 'COP',
    value: e.value,
    content_ids: [e.productId],
    content_name: e.name,
    content_type: 'product',
    contents: [{ id: e.productId, quantity: 1 }],
    plan: e.plan,
  }
}

/** Pixel general siempre; pixels extra según el origen del tráfico (ej. origen 105). */
export function pixelsForOrigin(origin: string | null | undefined): string[] {
  const extra = origin ? META_ORIGIN_PIXELS[origin] : undefined
  return extra ? [META_PIXEL_ID, extra] : [META_PIXEL_ID]
}

/** Los cuatro montos posibles son distintos, así que el monto confirmado por XPag identifica la oferta y el bump. */
export function orderFromAmount(amount: number): { offer: Offer; bump: boolean } | null {
  for (const offer of ['main', 'discount'] as const) {
    for (const bump of [false, true]) {
      if (computeAmount(offer, bump) === amount) return { offer, bump }
    }
  }
  return null
}
