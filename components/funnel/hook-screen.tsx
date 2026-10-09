'use client'

import { useState } from 'react'
import type { BalotoStats, Heat } from '@/lib/baloto'
import { formatDrawDate, track } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { Disclaimer, GoldButton, HEAT_LABEL } from './shared'

const RING: Record<Heat, { circle: string; label: string }> = {
  caliente: { circle: 'border-hot/70 bg-hot/20 text-hot', label: 'text-hot' },
  tibio: { circle: 'border-warm/70 bg-warm/15 text-warm', label: 'text-warm' },
  frio: { circle: 'border-cold/80 bg-cold/20 text-cold', label: 'text-cold' },
}

const pad = (n: number) => String(n).padStart(2, '0')

export function HookScreen({ stats, onContinue }: { stats: BalotoStats; onContinue: () => void }) {
  const [revealed, setRevealed] = useState(false)

  const reveal = () => {
    setRevealed(true)
    track('Lead', { content_name: 'Número caliente revelado' })
  }

  const hidden = !revealed

  return (
    <section aria-labelledby="hook-title" className="flex flex-col gap-6">
      <div className="flex justify-center">
        <span className="rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-center text-sm font-medium text-gold-2">
          {'🔓 Acceso parcial gratuito — desbloquea todo abriendo tus sobres'}
        </span>
      </div>

      <div className="flex flex-col gap-4 text-center">
        <h1 id="hook-title" className="text-balance font-display text-[3.25rem] uppercase leading-[0.95]">
          Descubre qué números salen más en el <span className="text-gold">Baloto</span>
        </h1>
        <p className="text-pretty text-lg leading-snug text-muted">
          Estadísticas actualizadas basadas en sorteos reales. Juega con datos, no con el azar.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-gradient-to-b from-card-2 to-card px-5 pb-6 pt-5">
        <span className="rounded-full bg-hot/15 px-4 py-1 font-display text-lg tracking-wider text-hot">
          {'🔥 MÁS CALIENTE'}
        </span>

        <div className="flex size-36 items-center justify-center rounded-full border-2 border-gold/70 bg-bg shadow-[0_0_48px_rgb(230_181_68/0.35)]">
          <span
            aria-hidden={hidden}
            className={cn(
              'font-display text-8xl leading-none text-gold-2 transition-[filter,opacity] duration-700',
              hidden && 'select-none opacity-80 blur-lg',
            )}
          >
            {pad(stats.hottest.number)}
          </span>
          {hidden && <span className="sr-only">Número oculto</span>}
        </div>

        <p className="text-muted">
          {stats.hottest.count}x en {stats.windowSize} sorteos · 5 números · 1-43
        </p>

        <ul className="grid w-full grid-cols-5 gap-2" aria-hidden={hidden}>
          {stats.row.map((n) => (
            <li key={n.number} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex size-14 items-center justify-center rounded-full border-2 font-display text-3xl leading-none transition-[filter] duration-700',
                  RING[n.heat].circle,
                  hidden && 'select-none blur-md',
                )}
              >
                {pad(n.number)}
              </span>
              <span className={cn('whitespace-nowrap text-xs', RING[n.heat].label)}>
                {HEAT_LABEL[n.heat]} · {n.count}x
              </span>
            </li>
          ))}
        </ul>

        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted" aria-label="Leyenda de colores">
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-hot" aria-hidden="true" /> Caliente
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-warm" aria-hidden="true" /> Tibio
          </li>
          <li className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-cold" aria-hidden="true" /> Frío
          </li>
        </ul>
      </div>

      <div aria-live="polite">
        {revealed ? (
          <GoldButton
            onClick={onContinue}
            className="animate-pop ring-2 ring-gold-2 ring-offset-4 ring-offset-bg shadow-[0_0_36px_rgb(230_181_68/0.45)]"
          >
            {'Continuar al test →'}
          </GoldButton>
        ) : (
          <GoldButton onClick={reveal} pulse>
            {'🎁 Revelar mi número caliente'}
          </GoldButton>
        )}
      </div>

      <div className="flex flex-col gap-1 text-center text-sm text-muted">
        <p>Basado en sorteos oficiales del Baloto</p>
        <p>
          Última actualización: {formatDrawDate(stats.lastDrawDate)} · Basado en sorteos oficiales de Coljuegos
        </p>
      </div>

      <Disclaimer>
        LoteSmart es una herramienta informativa basada en datos históricos oficiales. No garantiza premios ni
        resultados futuros. +18
      </Disclaimer>
    </section>
  )
}
