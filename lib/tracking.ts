type Fbq = (...args: unknown[]) => void

declare global {
  interface Window {
    fbq?: Fbq
  }
}

export function track(event: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', event, params)
}

/**
 * Queues the event even if fbevents.js hasn't finished loading: the inline snippet defines
 * a `fbq` stub that buffers calls, so we wait briefly for it instead of dropping the event.
 */
export function trackCheckout(
  event: 'InitiateCheckout' | 'AddPaymentInfo',
  params: { value: number; currency: 'COP'; content_name?: string; payment_type?: string },
) {
  if (typeof window === 'undefined') return
  const eventID = `${event}-${crypto.randomUUID()}`
  let attempts = 0
  const send = () => {
    if (window.fbq) {
      window.fbq('track', event, params, { eventID })
      return
    }
    if (++attempts < 40) window.setTimeout(send, 250)
  }
  send()
}

const PASSTHROUGH = /^(utm_.+|sck|fbclid)$/

export function buildCheckoutUrl(base: string) {
  if (typeof window === 'undefined') return base
  const url = new URL(base, window.location.origin)
  const incoming = new URLSearchParams(window.location.search)
  incoming.forEach((value, key) => {
    if (PASSTHROUGH.test(key) && !url.searchParams.has(key)) url.searchParams.set(key, value)
  })
  return url.toString()
}

export function goToCheckout(base: string) {
  const href = buildCheckoutUrl(base)
  window.setTimeout(() => {
    window.location.href = href
  }, 150)
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
