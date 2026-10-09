import 'server-only'
import { PRODUCTION_URL } from '@/lib/config'

export function appUrlFrom(req: Request) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production') return PRODUCTION_URL
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  return host ? `${proto}://${host}` : PRODUCTION_URL
}

export function clientIp(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined
}

export const clip = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : undefined)
