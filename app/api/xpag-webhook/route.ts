import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Sin base de datos: el estado se consulta en vivo en XPag cuando el comprador abre /gracias.
 * El Purchase para Meta lo envía XPag directamente, así que aquí solo registramos el aviso.
 */
export async function POST(req: Request) {
  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null
  console.log('[checkout] webhook XPag', JSON.stringify(payload).slice(0, 600))
  return NextResponse.json({ ok: true })
}
