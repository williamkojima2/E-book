'use client'

import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHECKOUT_CONFIG,
  CHECKOUT_MAIN_PATH,
  EXIT_INTENT_MOBILE_SECONDS,
  PITCH_TIME_SECONDS,
  PRICE_BEFORE,
  PRICE_MAIN,
  PREVIEW_MODE,
} from '@/lib/config'
import { goToCheckout } from '@/lib/tracking'
import { ScratchModal } from './scratch-card'
import { Disclaimer, GoldButton } from './shared'
import { VslPlayer } from './vsl-player'

const FEATURES = [
  'Análisis del historial oficial del Baloto, la Revancha y el Miloto',
  'Números calientes, tibios y fríos actualizados tras cada sorteo',
  'Combinaciones con mayor respaldo histórico',
  'Acceso desde el celular, sin instalar nada',
]

const FAQ = [
  { q: '¿Necesito saber de estadística?', a: 'No, la herramienta hace el análisis por ti.' },
  { q: '¿Sirve para Baloto, Revancha y Miloto?', a: 'Sí, los tres.' },
  { q: '¿Hay garantía?', a: 'Sí, tienes 7 días de garantía.' },
]

const cop = (v: number) => `COP$${v.toLocaleString('es-CO')}`

export function SalesScreen() {
  const [pitchVisible, setPitchVisible] = useState(PREVIEW_MODE)
  const [scratchOpen, setScratchOpen] = useState(false)
  const [scratchShown, setScratchShown] = useState(false)
  const clickedBuy = useRef(false)
  const fallbackTimer = useRef<number | undefined>(undefined)
  const buyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pitchVisible) return
    fallbackTimer.current = window.setTimeout(() => setPitchVisible(true), PITCH_TIME_SECONDS * 1000)
    return () => window.clearTimeout(fallbackTimer.current)
  }, [pitchVisible])

  const onTime = useCallback((seconds: number) => {
    window.clearTimeout(fallbackTimer.current)
    if (seconds >= PITCH_TIME_SECONDS) setPitchVisible(true)
  }, [])

  useEffect(() => {
    if (!pitchVisible || scratchShown) return
    const trigger = () => {
      if (clickedBuy.current) return
      setScratchShown(true)
      setScratchOpen(true)
    }
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) trigger()
    }
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let timer: number | undefined
    if (coarse) timer = window.setTimeout(trigger, EXIT_INTENT_MOBILE_SECONDS * 1000)
    else document.addEventListener('mouseout', onMouseOut)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }, [pitchVisible, scratchShown])

  const buy = () => {
    clickedBuy.current = true
    goToCheckout(CHECKOUT_MAIN_PATH)
  }

  const scrollToBuy = () => buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const closeScratch = useCallback(() => setScratchOpen(false), [])

  return (
    <section aria-labelledby="sales-title" className="flex flex-col gap-6">
      <h1 id="sales-title" className="text-balance text-center font-display text-5xl leading-[0.95] tracking-wide">
        Mira esto antes de tu próximo <span className="text-gold-2">sorteo</span>
      </h1>

      <VslPlayer onTime={onTime} />

      {pitchVisible && (
        <div className="animate-pop flex flex-col gap-6">
          <GoldButton onClick={scrollToBuy}>Quiero acceder a LoteSmart ↓</GoldButton>

          <div className="flex flex-col gap-5 rounded-2xl border border-gold/50 bg-card px-4 py-6">
            <div className="flex flex-col items-center text-center">
              <span className="text-sm uppercase tracking-wider text-gold">Oferta de lanzamiento — LoteSmart Colombia</span>
              <p className="mt-5 text-base text-muted">
                Antes: <s>{cop(PRICE_BEFORE)}</s>
              </p>
              <p className="font-display text-6xl leading-none tracking-tight text-gold-2 sm:text-7xl">{cop(PRICE_MAIN)}</p>
              <p className="mt-3 text-sm">Acceso vitalicio · pago único</p>
            </div>

            <ul className="flex flex-col gap-3 px-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-safe" aria-hidden="true" />
                  <span className="text-lg leading-snug">{f}</span>
                </li>
              ))}
            </ul>

            <div ref={buyRef} className="flex flex-col gap-3">
              <div className="rounded-3xl bg-black/40 p-3">
                <GoldButton onClick={buy}>Obtener acceso ahora</GoldButton>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-safe">
                <ShieldCheck className="size-4" aria-hidden="true" /> Pago seguro con Nequi o Bre-B · procesado por {CHECKOUT_CONFIG.processorName}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <h2 className="mb-1 font-display text-4xl uppercase tracking-wide">Preguntas frecuentes</h2>
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-xl border border-line bg-card px-4 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xl [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span aria-hidden="true" className="text-gold-2 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-muted">{item.a}</p>
              </details>
            ))}
          </div>

          <Disclaimer>
            Los resultados anteriores no garantizan premios futuros. LoteSmart ofrece análisis estadístico informativo, no
            predicciones. +18
          </Disclaimer>
        </div>
      )}

      {scratchOpen && <ScratchModal onClose={closeScratch} />}
      {scratchShown && !scratchOpen && (
        <button
          type="button"
          onClick={() => setScratchOpen(true)}
          className="btn-gold animate-gold-pulse fixed bottom-4 right-4 z-40 rounded-full px-4 py-3 font-display text-lg tracking-wide shadow-lg"
        >
          🎁 Ver mi descuento
        </button>
      )}
    </section>
  )
}
