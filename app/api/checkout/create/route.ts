import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { computeAmount, EMAIL_RE, isOffer, isPayMethod, PHONE_RE } from '@/lib/pricing'
import { type OrderClaim, paymentStatus, signOrder, verifyOrder } from '@/lib/server/order-token'
import { sha256 } from '@/lib/server/meta-capi'
import { appUrlFrom, clientIp, clip } from '@/lib/server/request'
import { consultTransaction, createCashin, isSandbox, RETRYABLE, XPagError } from '@/lib/server/xpag'

export const runtime = 'nodejs'
export const maxDuration = 30

const INSTRUCTION_TIMEOUT_MS = 15_000
const GENERIC_ERROR = 'No pudimos generar tu pago, inténtalo de nuevo.'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function fail(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

async function cashinWithRetry(input: Parameters<typeof createCashin>[0]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await createCashin(input)
    } catch (e) {
      if (e instanceof XPagError && RETRYABLE.has(e.code) && attempt < 2) {
        await sleep(800 * (attempt + 1))
        continue
      }
      throw e
    }
  }
}

/** Datos de atribución para el Purchase por CAPI; el webhook los lee de la query porque no hay base de datos. */
function webhookUrlFor(req: Request, appUrl: string, email: string, tracking: unknown) {
  const t = (tracking && typeof tracking === 'object' ? tracking : {}) as Record<string, unknown>
  const params = new URLSearchParams({ em: sha256(email) })
  const fbp = clip(t.fbp)
  const fbc = clip(t.fbc, 300)
  const origin = clip(t.origin, 20)
  const ip = clientIp(req)
  const ua = clip(req.headers.get('user-agent') ?? undefined, 400)
  if (fbp && /^fb\.\d\.\d+\.\d+$/.test(fbp)) params.set('fbp', fbp)
  if (fbc && /^fb\.\d\.\d+\..+$/.test(fbc)) params.set('fbc', fbc)
  if (origin && /^[\w-]+$/.test(origin)) params.set('o', origin)
  if (ip) params.set('ip', ip)
  if (ua) params.set('ua', ua)
  return `${appUrl}/api/xpag-webhook?${params}`
}

async function waitForCheckoutUrl(transactionId: string) {
  const deadline = Date.now() + INSTRUCTION_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const tx = await consultTransaction(transactionId)
      if (tx.checkoutUrl) return tx.checkoutUrl
      if (tx.status === 'expired' || tx.status === 'failed') return null
    } catch (e) {
      if (!(e instanceof XPagError && RETRYABLE.has(e.code))) console.error('[checkout] consult-transaction', e)
    }
    await sleep(1000)
  }
  return null
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return fail(GENERIC_ERROR)

  const offer = body.offer
  const method = body.method
  const bump = body.bump === true
  const email = String(body.email ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim().replace(/\s+/g, ' ')
  const phone = String(body.phone ?? '').replace(/\D/g, '')

  if (!isOffer(offer)) return fail('Oferta inválida.')
  if (!isPayMethod(method)) return fail('Elige un método de pago.', 400, { field: 'method' })
  if (name.length < 3 || name.length > 80) return fail('Escribe tu nombre completo.', 400, { field: 'name' })
  if (!EMAIL_RE.test(email) || email.length > 120) return fail('Escribe un email válido.', 400, { field: 'email' })
  if (!PHONE_RE.test(phone)) {
    return fail('Escribe un celular colombiano de 10 dígitos (empieza por 3).', 400, { field: 'phone' })
  }

  const amount = computeAmount(offer, bump)
  const appUrl = appUrlFrom(req)

  try {
    // Reintento del mismo carrito: reutiliza la transacción pendiente en lugar de crear otro cobro.
    const previous = verifyOrder(typeof body.token === 'string' ? body.token : null)
    if (
      previous &&
      previous.amount === amount &&
      previous.phone === phone &&
      previous.method === method &&
      previous.email === email
    ) {
      const current = await paymentStatus(previous)
      if (current.status === 'pending') {
        const checkoutUrl = current.checkoutUrl ?? (await waitForCheckoutUrl(previous.tx))
        if (checkoutUrl) {
          return NextResponse.json({ ok: true, token: body.token, checkoutUrl, sandbox: isSandbox })
        }
      }
    }

    const ref = `LS-${randomUUID()}`
    const cashin = await cashinWithRetry({
      method,
      amount,
      phone,
      externalId: ref,
      webhookUrl: webhookUrlFor(req, appUrl, email, body.tracking),
      appUrl,
    })
    const claim: OrderClaim = { ref, tx: cashin.transactionId, offer, bump, amount, email, phone, method, iat: Date.now() }
    const token = signOrder(claim)

    const checkoutUrl = cashin.checkoutUrl ?? (await waitForCheckoutUrl(cashin.transactionId))
    if (!checkoutUrl) return fail(GENERIC_ERROR, 504, { token, retryable: true })
    return NextResponse.json({ ok: true, token, checkoutUrl, sandbox: isSandbox })
  } catch (e) {
    if (e instanceof XPagError) {
      console.error('[checkout] XPag /cashin', e.code, e.message)
      if (e.code === 'phone_required') return fail('Revisa tu celular.', 422, { field: 'phone' })
      if (e.code === 'amount_below_min') return fail('El monto es menor al mínimo permitido.', 422)
      if (RETRYABLE.has(e.code)) {
        return fail('El servicio de pago está ocupado. Inténtalo de nuevo en unos segundos.', 503, { retryable: true })
      }
      return fail(GENERIC_ERROR, 502)
    }
    console.error('[checkout] create', e)
    return fail(GENERIC_ERROR, 500)
  }
}
