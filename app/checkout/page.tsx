import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Image from 'next/image'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from '@/lib/config'
import { isOffer } from '@/lib/pricing'

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], variable: '--font-fraunces' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Finaliza tu compra — LoteSmart Colombia',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#070B24',
}

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ offer?: string }> }) {
  const { offer } = await searchParams
  const whatsapp = String(SUPPORT_WHATSAPP).replace(/\D/g, '')
  const email = String(SUPPORT_EMAIL)
  const contactHref = whatsapp ? `https://wa.me/${whatsapp}` : email ? `mailto:${email}` : null

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
        <CheckoutForm offer={isOffer(offer) ? offer : 'main'} />
      </main>

      <footer className="bg-[#0B0B0B] p-8 text-base leading-relaxed text-white">
        <div className="mx-auto flex max-w-[480px] flex-col gap-4">
          {contactHref && (
            <a href={contactHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              ¿Tienes dudas sobre el producto? Ponte en contacto
            </a>
          )}
          {SUPPORT_EMAIL && (
            <p>
              ¿No puedes finalizar la compra? Escríbenos a{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">
                {SUPPORT_EMAIL}
              </a>
            </p>
          )}
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
