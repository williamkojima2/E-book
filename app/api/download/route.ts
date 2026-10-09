import { NextResponse } from 'next/server'
import { DELIVERABLE_PDFS, type PdfKey } from '@/lib/config'
import { isPaid } from '@/lib/server/order-token'
import { readPdf } from '@/lib/server/pdfs'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const key = params.get('file') as PdfKey | null
  if (!key || !(key in DELIVERABLE_PDFS)) return NextResponse.json({ ok: false }, { status: 400 })

  const claim = await isPaid(params.get('t'))
  if (!claim) return NextResponse.json({ ok: false, error: 'Pago no confirmado' }, { status: 403 })
  if (key === 'bonus' && !claim.bump) return NextResponse.json({ ok: false }, { status: 403 })

  const pdf = DELIVERABLE_PDFS[key]
  const file = await readPdf(pdf.file)
  if (!file) return NextResponse.json({ ok: false, error: 'Archivo aún no disponible' }, { status: 404 })

  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdf.file}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
