import { META_PIXEL_ID } from '@/lib/config'

type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
    __lsPixels?: string[]
  }
}

const ORIGIN_KEY = 'ls_origin'
const IC_KEY = 'ls_ic'

export function trafficOrigin(): string | null {
  try {
    return window.sessionStorage.getItem(ORIGIN_KEY)
  } catch {
    return null
  }
}

/**
 * Envía con trackSingle a cada pixel activo (general + el del origen). Espera brevemente a fbq
 * por si el snippet aún no corrió, en lugar de perder el evento.
 */
export function trackPixels(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === 'undefined') return
  let attempts = 0
  const send = () => {
    if (window.fbq) {
      for (const id of window.__lsPixels ?? [META_PIXEL_ID]) {
        window.fbq('trackSingle', id, event, params ?? {}, eventID ? { eventID } : undefined)
      }
      return
    }
    if (++attempts < 40) window.setTimeout(send, 250)
  }
  send()
}

export function track(event: string, params?: Record<string, unknown>) {
  trackPixels(event, params)
}

export function trackInitiateCheckout(params: { value: number; currency: 'COP'; content_name: string }) {
  trackPixels('InitiateCheckout', params, `ic_${crypto.randomUUID()}`)
  try {
    window.sessionStorage.setItem(IC_KEY, '1')
  } catch {}
}

/** Solo dispara si el clic del CTA no lo hizo ya (ej. alguien que entra directo al checkout). */
export function trackInitiateCheckoutOnce(params: { value: number; currency: 'COP'; content_name: string }) {
  try {
    if (window.sessionStorage.getItem(IC_KEY)) return
  } catch {}
  trackInitiateCheckout(params)
}

export function trackAddPaymentInfo(params: { value: number; currency: 'COP'; payment_type: string }) {
  trackPixels('AddPaymentInfo', params, `api_${crypto.randomUUID()}`)
}

const PASSTHROUGH = /^(utm_.+|sck|fbclid|origem|origen|src)$/

export function buildCheckoutUrl(base: string) {
  if (typeof window === 'undefined') return base
  const url = new URL(base, window.location.origin)
  const incoming = new URLSearchParams(window.location.search)
  incoming.forEach((value, key) => {
    if (PASSTHROUGH.test(key) && !url.searchParams.has(key)) url.searchParams.set(key, value)
  })
  return url.toString()
}

export function goToCheckout(base: string, ic?: { value: number; content_name: string }) {
  if (ic) trackInitiateCheckout({ ...ic, currency: 'COP' })
  const href = buildCheckoutUrl(base)
  // Deja tiempo a que el pixel envíe el InitiateCheckout antes de navegar.
  window.setTimeout(() => {
    window.location.href = href
  }, 300)
}

const formatter = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDrawDate(date: string, withWeekday = false) {
  const d = new Date(`${date}T12:00:00Z`)
  if (withWeekday) return formatter.format(d)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d)
}
