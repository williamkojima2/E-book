'use client'

import {
  BarChart3,
  CalendarClock,
  Link2,
  Lock,
  type LucideIcon,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import type { BalotoStats } from '@/lib/baloto'
import { formatDrawDate, track } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { type QuizAnswers, scoreAnswers } from './quiz-screen'
import { Ball, Confetti, Disclaimer, GoldButton } from './shared'

const TREND = {
  up: { label: '↑ Subiendo', className: 'text-safe' },
  down: { label: '↓ Bajando', className: 'text-cold' },
  flat: { label: '→ Estable', className: 'text-muted' },
}

export function ResultScreen({
  stats,
  answers,
  onContinue,
}: {
  stats: BalotoStats
  answers: QuizAnswers
  onContinue: () => void
}) {
  const score = scoreAnswers(answers)
  const [opened, setOpened] = useState<boolean[]>([false, false, false])
  const complete = opened.every(Boolean)

  const envelopes = [
    {
      rarity: '🔥 Legendario',
      tone: 'caliente' as const,
      number: stats.legendary.number,
      text: `Salió ${stats.legendary.count} veces en los últimos ${stats.windowSize} sorteos`,
      accent: 'border-hot/60 from-hot/25',
    },
    {
      rarity: '⚡ Raro',
      tone: 'tibio' as const,
      number: stats.rare.number,
      text: `Salió ${stats.rare.count} veces en los últimos ${stats.windowSize} sorteos`,
      accent: 'border-warm/60 from-warm/20',
    },
    {
      rarity: '❄️ Frío',
      tone: 'frio' as const,
      number: stats.cold.number,
      text: `No sale hace ${stats.cold.drawsSince} sorteos`,
      accent: 'border-cold/60 from-cold/25',
    },
  ]

  const open = (i: number) => {
    if (opened[i]) return
    const next = opened.map((o, j) => o || j === i)
    setOpened(next)
    if (next.every(Boolean)) track('Lead', { content_name: 'SetComplete' })
  }

  const radius = 52
  const circumference = 2 * Math.PI * radius

  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-gradient-to-b from-card-2 to-card px-5 py-6 text-center">
        <h1 id="result-title" className="font-display text-5xl uppercase leading-none">
          Tu resultado
        </h1>
        <div className="relative size-40">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--ls-card-2)" strokeWidth="9" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="var(--ls-gold)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
              className="transition-[stroke-dashoffset] duration-1000"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-6xl leading-none text-gold-2">{score}%*</span>
            <span className="text-sm text-muted">coincidencia</span>
          </span>
        </div>
        <p className="text-pretty text-lg font-medium leading-snug">
          Según tus respuestas, tu perfil coincide con jugadores que podrían beneficiarse de un análisis basado en
          datos históricos antes de apostar.
        </p>
        <p className="text-pretty text-xs text-muted">
          *Estimación calculada a partir de tus respuestas. No es una predicción de resultados ni garantiza premios.
        </p>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-gold/40 bg-gradient-to-b from-card-2 to-card px-5 py-6">
        <div className="flex flex-col gap-1 text-center">
          <h2 className="font-display text-[2rem] uppercase leading-none text-gold-2">
            {'🎁 Tu premio por completar el test'}
          </h2>
          <p className="text-muted">Abre tus 3 sobres para desbloquear el resto del análisis</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {envelopes.map((env, i) => (
            <button
              key={env.rarity}
              type="button"
              onClick={() => open(i)}
              aria-label={opened[i] ? `${env.rarity}: número ${env.number}. ${env.text}` : `Abrir sobre ${i + 1}`}
              aria-pressed={opened[i]}
              className={cn(
                'flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2 text-center transition-transform',
                opened[i]
                  ? cn('border-solid bg-gradient-to-b to-bg', env.accent)
                  : 'border-dashed border-gold/40 bg-bg hover:-translate-y-1 hover:border-gold/70',
              )}
            >
              {opened[i] ? (
                <span className="animate-pop flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold">{env.rarity}</span>
                  <Ball value={env.number} tone={env.tone} size="lg" />
                  <span className="text-xs leading-tight text-muted">{env.text}</span>
                </span>
              ) : (
                <>
                  <span className="text-5xl" aria-hidden="true">
                    📦
                  </span>
                  <span className="font-display text-2xl uppercase tracking-wide text-gold">Sobre {i + 1}</span>
                </>
              )}
            </button>
          ))}
        </div>

        <p className="text-center font-medium" aria-live="polite">
          {complete ? (
            <span className="text-safe">✔ Set completo</span>
          ) : (
            <span className="text-muted">Toca cualquier sobre cerrado para abrirlo</span>
          )}
        </p>
      </div>

      {complete && (
        <>
          <Confetti />
          <div className="animate-pop flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-2">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Análisis desbloqueado parcialmente
              </span>
              <p className="text-pretty text-sm text-muted">
                Esto es una muestra de lo que verás en la versión completa.
              </p>
            </div>

            <PreviewBlock
              icon={BarChart3}
              title="Historial completo"
              subtitle={`Últimos 12 meses · ${stats.historyDraws} sorteos`}
            >
              <div className="overflow-hidden rounded-2xl border border-line bg-bg/60">
                <div className="grid grid-cols-3 border-b border-line px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
                  <span>Número</span>
                  <span className="text-center">Apariciones</span>
                  <span className="text-right">Tendencia</span>
                </div>
                <ul className="divide-y divide-line">
                  {stats.history.map((h, i) => (
                    <LockedRow key={h.number} locked={i > 0}>
                      <Ball value={h.number} tone="caliente" size="sm" />
                      <span className="text-center font-display text-2xl leading-none">{h.count}</span>
                      <span className={cn('text-right font-medium', TREND[h.trend].className)}>
                        {TREND[h.trend].label}
                      </span>
                    </LockedRow>
                  ))}
                </ul>
              </div>
            </PreviewBlock>

            <PreviewBlock icon={Link2} title="Pares más frecuentes" subtitle="Números que suelen salir juntos">
              <ul className="flex flex-col gap-2">
                {stats.pairs.map((p, i) => (
                  <LockedRow key={`${p.a}-${p.b}`} locked={i > 0} variant="card">
                    <span className="col-span-2 flex items-center gap-2">
                      <Ball value={p.a} tone="tibio" size="sm" />
                      <Plus className="size-4 text-muted" aria-hidden="true" />
                      <Ball value={p.b} tone="tibio" size="sm" />
                    </span>
                    <span className="justify-self-end rounded-full bg-warm/15 px-2.5 py-1 text-xs font-semibold text-warm">
                      {p.count} veces juntos
                    </span>
                  </LockedRow>
                ))}
              </ul>
            </PreviewBlock>

            <PreviewBlock icon={RefreshCw} title="Actualización automática" subtitle="Los datos se renuevan tras cada sorteo">
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg/60 p-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold-2">
                  <CalendarClock className="size-5" aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted">
                    <span className="relative flex size-2" aria-hidden="true">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-70" />
                      <span className="relative inline-flex size-2 rounded-full bg-safe" />
                    </span>
                    Próxima actualización
                  </span>
                  <span className="font-display text-xl capitalize leading-tight text-ink">
                    {formatDrawDate(stats.nextDrawDate, true)}
                  </span>
                </div>
              </div>
            </PreviewBlock>

            <div className="flex flex-col gap-2 pt-1">
              <GoldButton onClick={onContinue} pulse>
                Ver el video ahora
              </GoldButton>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                <Lock className="size-3.5" aria-hidden="true" />
                Descubre cómo desbloquear el análisis completo
              </p>
            </div>
          </div>
        </>
      )}

      <Disclaimer>Los datos provienen del historial oficial del Baloto. No garantizan premios futuros. +18</Disclaimer>
    </section>
  )
}

function PreviewBlock({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-gradient-to-b from-card-2 to-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold-2">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="font-display text-2xl uppercase leading-none tracking-wide">{title}</h3>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function LockedRow({
  locked,
  variant = 'row',
  children,
}: {
  locked: boolean
  variant?: 'row' | 'card'
  children: React.ReactNode
}) {
  return (
    <li
      className={cn(
        'relative',
        variant === 'row' ? 'px-3 py-2.5' : 'rounded-2xl border border-line bg-bg/60 px-3 py-2.5',
      )}
    >
      <div
        aria-hidden={locked}
        className={cn('grid grid-cols-3 items-center text-sm', locked && 'select-none opacity-60 blur-[6px]')}
      >
        {children}
      </div>
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-bg/90 px-3 py-1 text-xs font-semibold text-gold-2 shadow-lg shadow-black/40">
            <Lock className="size-3.5" aria-hidden="true" /> Bloqueado en la versión completa
          </span>
        </span>
      )}
    </li>
  )
}
