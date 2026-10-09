import { PRICE_BUMP, PRICE_MAIN, PRICE_SCRATCH } from '@/lib/config'

export type Offer = 'main' | 'discount'
export type PayMethod = 'NEQUI' | 'BREB'

export const OFFER_PRICES: Record<Offer, number> = { main: PRICE_MAIN, discount: PRICE_SCRATCH }

export function isOffer(value: unknown): value is Offer {
  return value === 'main' || value === 'discount'
}

export function isPayMethod(value: unknown): value is PayMethod {
  return value === 'NEQUI' || value === 'BREB'
}

export function computeAmount(offer: Offer, bump: boolean) {
  return OFFER_PRICES[offer] + (bump ? PRICE_BUMP : 0)
}

export const PHONE_RE = /^3\d{9}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const cop = (v: number) => `COP$${v.toLocaleString('es-CO')}`
