import type { Offer } from '@/lib/pricing'

export type MethodId = 'card' | 'nequi' | 'breb'

export type PaymentItem = { id: 'main' | 'bump'; name: string; price: number }

export type PaymentInput = {
  method: MethodId
  installments: number
  amount: number
  customer: { name: string; email: string; phone?: string }
  items: PaymentItem[]
}

export type PaymentContext = {
  offer: Offer
  retryToken: string | null
  tracking: Record<string, unknown>
}

export type PaymentResult =
  | { ok: true; token: string; checkoutUrl: string; sandbox: boolean }
  | { ok: false; error: string; field?: string; token?: string; retryable?: boolean }

const GENERIC_ERROR = 'No pudimos generar tu pago, inténtalo de nuevo.'

export async function createPayment(input: PaymentInput, context: PaymentContext): Promise<PaymentResult> {
  // integrar XPag aqui
  if (input.method === 'card') {
    return { ok: false, error: 'El pago con tarjeta aún no está disponible. Elige otro método de pago.' }
  }

  try {
    // El servidor recalcula el monto a partir de la oferta y los items; "amount" no se usa como fuente de verdad.
    const res = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer: context.offer,
        bump: input.items.some((i) => i.id === 'bump'),
        method: input.method === 'nequi' ? 'NEQUI' : 'BREB',
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone ?? '',
        token: context.retryToken,
        tracking: context.tracking,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? GENERIC_ERROR,
        field: data.field,
        token: data.token,
        retryable: Boolean(data.retryable),
      }
    }
    return { ok: true, token: data.token, checkoutUrl: data.checkoutUrl, sandbox: Boolean(data.sandbox) }
  } catch {
    return { ok: false, error: 'Revisa tu conexión e inténtalo de nuevo.' }
  }
}
