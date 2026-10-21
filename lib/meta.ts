import { CHECKOUT_CONFIG, META_ORIGIN_PIXELS, META_PIXEL_ID, PRICE_BUMP } from '@/lib/config'
import { computeAmount, OFFER_PRICES, type Offer } from '@/lib/pricing'

export const META_PRODUCTS = {
  main: { id: 'lotesmart-colombia', name: CHECKOUT_CONFIG.productName },
  bump: { id: 'bonos-lotesmart', name: CHECKOUT_CONFIG.bumpName },
} as const

type PurchaseItem = { id: string; name: string; price: number }

export type PurchaseEvent = {
  eventId: string
  value: number
  plan: Offer
  items: PurchaseItem[]
}

/** Una sola compra por pago (principal + bump juntos), con eventID estable para que Meta deduplique navegador y servidor. */
export function purchaseEvents(paymentId: string, offer: Offer, bump: boolean): PurchaseEvent[] {
  const items: PurchaseItem[] = [{ id: META_PRODUCTS.main.id, name: META_PRODUCTS.main.name, price: OFFER_PRICES[offer] }]
  if (bump) items.push({ id: META_PRODUCTS.bump.id, name: META_PRODUCTS.bump.name, price: PRICE_BUMP })
  return [
    {
      eventId: `purchase_${paymentId}`,
      value: items.reduce((sum, i) => sum + i.price, 0),
      plan: offer,
      items,
    },
  ]
}

export function purchaseCustomData(e: PurchaseEvent) {
  return {
    currency: 'COP',
    value: e.value,
    content_ids: e.items.map((i) => i.id),
    content_name: e.items.map((i) => i.name).join(' + '),
    content_type: 'product',
    contents: e.items.map((i) => ({ id: i.id, quantity: 1, item_price: i.price })),
    num_items: e.items.length,
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
