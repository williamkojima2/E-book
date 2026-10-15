import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { CheckoutForm, type ResumeOrder } from '@/components/checkout/checkout-form'
import { SUPPORT_EMAIL } from '@/lib/config'
import { isOffer } from '@/lib/pricing'
import { paymentStatus, verifyOrder } from '@/lib/server/order-token'
import { isSandbox } from '@/lib/server/xpag'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], variable: '--font-fraunces' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Finaliza tu compra — LoteSmart Colombia',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#070B24',
}

function safeCheckoutUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const trusted = url.hostname === 'magenpay.io' || url.hostname.endsWith('.magenpay.io')
    return url.protocol === 'https:' && trusted ? url.toString() : null
  } catch {
    return null
  }
}

async function resumeOrder(token: string | undefined, savedUrl: string | undefined): Promise<ResumeOrder | null> {
  const claim = verifyOrder(token)
  if (!claim || !token) return null
  let result: Awaited<ReturnType<typeof paymentStatus>>
  try {
    result = await paymentStatus(claim)
  } catch (e) {
    console.error('[checkout] resume', claim.ref, e)
    return null
  }
  if (result.status === 'paid') redirect(`/gracias?t=${encodeURIComponent(token)}`)
  const checkoutUrl = result.checkoutUrl ?? safeCheckoutUrl(savedUrl)
  if (result.status !== 'pending' || !checkoutUrl) return null
  return {
    token,
    checkoutUrl,
    sandbox: isSandbox,
    offer: claim.offer,
    bump: claim.bump,
    method: claim.method === 'NEQUI' ? 'nequi' : 'breb',
  }
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string; t?: string; p?: string }>
}) {
  const { offer, t, p } = await searchParams
  const resume = await resumeOrder(t, p)
  const contactHref = `mailto:${SUPPORT_EMAIL}`

  return (
    <div className={`${fraunces.variable} ${inter.variable} flex min-h-dvh flex-col bg-[#070B24] [font-family:var(--font-inter)]`}>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-4 px-3 pt-4 pb-8">
        <Image
          src="/banner-app.jpg"
          alt="LoteSmart App: juega con datos, no con suerte. Números calientes y atrasados del Baloto y combinaciones sugeridas por el historial"
          width={1344}
          height={768}
          priority
          className="h-auto w-full rounded-xl"
        />
        <Image
          src="/banner-prova-social.jpg"
          alt="Más de 12.000 colombianos ya revisan sus números con LoteSmart: opiniones de Carlos Restrepo, Martha Lucía Gómez y Jorge Martínez"
          width={1344}
          height={768}
          className="h-auto w-full rounded-xl"
        />
        <CheckoutForm offer={resume?.offer ?? (isOffer(offer) ? offer : 'main')} resume={resume} />
      </main>

      <footer className="bg-[#0B0B0B] p-8 text-base leading-relaxed text-white">
        <div className="mx-auto flex max-w-[480px] flex-col gap-4">
          <a href={contactHref} className="underline underline-offset-4">
            ¿Tienes dudas sobre el producto? Ponte en contacto
          </a>
          <p>
            ¿No puedes finalizar la compra? Escríbenos a{' '}
            <a href={contactHref} className="break-all underline underline-offset-4">
              {SUPPORT_EMAIL}
            </a>
          </p>
          <p>
            Al hacer clic en &quot;Comprar ahora&quot;, aceptas los Términos de Uso y la Política de Privacidad de
            LoteSmart y declaras ser mayor de edad.
          </p>
          <p>LoteSmart es una herramienta de análisis estadístico. No garantiza premios ni está afiliada a Baloto.</p>
          <p>LoteSmart © 2026 - Todos los derechos reservados</p>
        </div>
      </footer>
    </div>
  )
}
