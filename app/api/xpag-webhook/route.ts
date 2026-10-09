import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/** Sin base de datos no hay estado que actualizar: el estado se consulta en vivo en XPag. Solo confirmamos la recepción. */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (payload) {
    console.log('[checkout] webhook XPag', payload.status, payload.transaction_id, payload.external_id)
  }
  return NextResponse.json({ ok: true })
}
