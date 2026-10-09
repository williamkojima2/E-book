'use client'

import { useMemo } from 'react'
import type { Heat } from '@/lib/baloto'
import { cn } from '@/lib/utils'

export const HEAT_LABEL: Record<Heat, string> = { caliente: 'Caliente', tibio: 'Tibio', frio: 'Frío' }

const HEAT_BALL: Record<Heat | 'super', string> = {
  caliente: 'bg-hot text-white shadow-[0_0_18px_rgb(229_72_77/0.45)]',
  tibio: 'bg-warm text-[#1a1404]',
  frio: 'bg-cold text-white',
  super: 'bg-super text-[#160c2e] shadow-[0_0_18px_rgb(167_139_250/0.45)]',
}

export function Ball({
  value,
  tone,
  size = 'md',
  className,
}: {
  value: number
  tone: Heat | 'super'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizes = { sm: 'size-9 text-lg', md: 'size-12 text-2xl', lg: 'size-16 text-3xl', xl: 'size-24 text-5xl' }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display leading-none ring-2 ring-white/15',
        HEAT_BALL[tone],
        sizes[size],
        className,
      )}
    >
      {String(value).padStart(2, '0')}
    </span>
  )
}

export function GoldButton({
  children,
  className,
  pulse,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pulse?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'btn-gold w-full rounded-2xl px-5 py-5 font-display text-3xl uppercase tracking-wide shadow-[0_8px_32px_rgb(230_181_68/0.25)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        pulse && 'animate-gold-pulse',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return <p className="text-pretty text-center text-xs leading-relaxed text-muted">{children}</p>
}

const COLORS = ['#ffd76a', '#e6b544', '#3ecf6a', '#e5484d', '#4f7cff', '#a78bfa']

export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        dx: `${((i * 53) % 40) - 20}vw`,
        dur: `${2.2 + ((i * 7) % 10) / 6}s`,
        delay: `${((i * 13) % 10) / 20}s`,
        color: COLORS[i % COLORS.length],
        w: 6 + (i % 3) * 3,
      })),
    [count],
  )
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece absolute top-0 block rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.w * 1.6,
              background: p.color,
              '--dx': p.dx,
              '--dur': p.dur,
              '--delay': p.delay,
              transform: 'translate3d(0,-10vh,0)',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
