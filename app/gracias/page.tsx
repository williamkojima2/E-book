import { AlertTriangle, CheckCircle2, Download, ExternalLink, Gift, MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { PixelPurchase } from '@/components/pixel-events'
import { ACCESS_URL, CHECKOUT_CONFIG, DELIVERABLE_PDFS, type PdfKey, SUPPORT_WHATSAPP } from '@/lib/config'
import { isPaid } from '@/lib/server/order-token'
import { pdfExists } from '@/lib/server/pdfs'

export const metadata: Metadata = {
  title: 'Gracias por tu compra — LoteSmart Colombia',
  robots: { index: false, follow: false },
}

type Item = { key: PdfKey; label: string; href: string | null }

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams
  const claim = await isPaid(t)

  if (!claim || !t) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
        <NotConfirmed />
      </main>
    )
  }

  const keys: PdfKey[] = claim.bump ? ['main', 'bonus'] : ['main']
  const items: Item[] = await Promise.all(
    keys.map(async (key) => ({
      key,
      label: DELIVERABLE_PDFS[key].label,
      href: (await pdfExists(DELIVERABLE_PDFS[key].file))
        ? `/api/download?file=${key}&t=${encodeURIComponent(t)}`
        : null,
    })),
  )

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <Paid email={claim.email} items={items} />
      <PixelPurchase paymentId={claim.tx} offer={claim.offer} bump={claim.bump} />
    </main>
  )
}

function Paid({ email, items }: { email: string; items: Item[] }) {
  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-safe/50 bg-card p-6 text-center">
      <CheckCircle2 className="size-14 text-safe" aria-hidden="true" />
      <h1 className="text-balance font-display text-4xl leading-tight tracking-wide">
        ¡Pago confirmado! Tu acceso a {CHECKOUT_CONFIG.productName} ya está listo.
      </h1>

      <a
        href={ACCESS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-gold flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 font-display text-2xl tracking-wide"
      >
        Entrar a LoteSmart <ExternalLink className="size-5" aria-hidden="true" />
      </a>
      <p className="text-sm text-muted">
        Usa el mismo correo de tu compra: <strong className="break-all text-ink">{email}</strong>
      </p>

      <div
        role="alert"
        className="flex w-full items-start gap-3 rounded-xl border-2 border-gold bg-gold/10 px-4 py-4 text-left"
      >
        <AlertTriangle className="mt-0.5 size-6 shrink-0 text-gold-2" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl leading-tight tracking-wide text-gold-2">
            Descarga tu PDF ahora mismo
          </p>
          <p className="text-pretty text-sm leading-relaxed text-ink">
            Esta página es de un solo uso: después de cerrarla <strong>no podrás volver a abrirla</strong>. El PDF
            contiene el enlace de acceso y todas las instrucciones, así que guárdalo en tu celular antes de salir.
          </p>
        </div>
      </div>

      <ul className="flex w-full flex-col gap-3">
        {items.map((item) => (
          <li key={item.key}>
            {item.href ? (
              <a
                href={item.href}
                download
                className="flex w-full items-center gap-3 rounded-xl border border-gold/50 bg-card-2 px-4 py-4 text-left hover:border-gold-2"
              >
                {item.key === 'bonus' ? (
                  <Gift className="size-6 shrink-0 text-gold-2" aria-hidden="true" />
                ) : (
                  <Download className="size-6 shrink-0 text-gold-2" aria-hidden="true" />
                )}
                <span className="flex flex-col">
                  <span className="text-lg leading-tight">{item.label}</span>
                  <span className="text-sm font-semibold text-gold-2">Toca aquí para descargar ahora</span>
                </span>
              </a>
            ) : (
              <div className="flex w-full items-center gap-3 rounded-xl border border-line bg-card-2 px-4 py-4 text-left opacity-70">
                <Download className="size-6 shrink-0 text-muted" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="text-lg leading-tight">{item.label}</span>
                  <span className="text-sm text-muted">Disponible muy pronto</span>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="text-pretty text-sm text-muted">
        Después de descargar, abre el PDF para confirmar que se guardó bien. Desde el PDF siempre podrás volver a
        entrar a LoteSmart.
      </p>
    </section>
  )
}

function NotConfirmed() {
  const wa = SUPPORT_WHATSAPP
    ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hola, necesito ayuda con mi compra de LoteSmart Colombia.')}`
    : null
  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-line bg-card p-6 text-center">
      <h1 className="font-display text-4xl tracking-wide">Aún no vemos tu pago confirmado</h1>
      <p className="text-pretty text-muted">
        Si acabas de pagar, espera unos segundos y recarga esta página. Si tienes dudas, escríbenos por WhatsApp.
      </p>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-safe px-5 py-4 font-display text-2xl tracking-wide text-[#06210f]"
        >
          <MessageCircle className="size-6" aria-hidden="true" /> Hablar por WhatsApp
        </a>
      )}
    </section>
  )
}
