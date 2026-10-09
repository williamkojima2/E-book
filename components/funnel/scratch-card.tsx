'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CHECKOUT_DISCOUNT_PATH, PRICE_MAIN, PRICE_SCRATCH } from '@/lib/config'
import { goToCheckout } from '@/lib/tracking'
import { Confetti, GoldButton } from './shared'

const WIDTH = 220
const HEIGHT = 130
const REVEAL_RATIO = 0.55

const cop = (v: number) => `COP$${v.toLocaleString('es-CO')}`

export function ScratchModal({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawing = useRef(false)
  const moves = useRef(0)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = WIDTH * dpr
    canvas.height = HEIGHT * dpr
    ctx.scale(dpr, dpr)
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
    gradient.addColorStop(0, '#ffd76a')
    gradient.addColorStop(0.5, '#c9962e')
    gradient.addColorStop(1, '#ffd76a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#1a1404'
    ctx.font = '26px "Bebas Neue", "Arial Narrow", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('RASPA AQUÍ', WIDTH / 2, HEIGHT / 2)
  }, [])

  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || revealed) return
    const canvas = e.currentTarget
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * WIDTH
    const y = ((e.clientY - rect.top) / rect.height) * HEIGHT
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 18, 0, Math.PI * 2)
    ctx.fill()
    moves.current += 1
    if (moves.current % 6 === 0) checkCleared(canvas, ctx)
  }

  const checkCleared = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let clear = 0
    let total = 0
    for (let i = 3; i < data.length; i += 4 * 16) {
      total++
      if (data[i] === 0) clear++
    }
    if (clear / total > REVEAL_RATIO) setRevealed(true)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scratch-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {revealed && <Confetti />}
      <div className="animate-pop relative flex w-full max-w-[380px] flex-col items-center gap-4 rounded-2xl border border-gold/50 bg-card p-6 text-center">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-card-2 hover:text-ink"
        >
          <X className="size-5" />
        </button>
        <h2 id="scratch-title" className="font-display text-3xl tracking-wide text-gold-2">
          ¡Espera! Tienes un descuento
        </h2>
        <p className="text-muted">Raspa la tarjeta para descubrir tu precio especial.</p>

        <div className="relative overflow-hidden rounded-xl" style={{ width: WIDTH, height: HEIGHT }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card-2">
            <span className="text-xs text-muted line-through">{cop(PRICE_MAIN)}</span>
            <span className="font-display text-5xl text-gold-2">{cop(PRICE_SCRATCH)}</span>
          </div>
          {!revealed && (
            <canvas
              ref={canvasRef}
              aria-label="Tarjeta para raspar"
              className="absolute inset-0 size-full cursor-grab touch-none"
              onPointerDown={(e) => {
                drawing.current = true
                e.currentTarget.setPointerCapture(e.pointerId)
                scratch(e)
              }}
              onPointerMove={scratch}
              onPointerUp={() => (drawing.current = false)}
              onPointerCancel={() => (drawing.current = false)}
            />
          )}
        </div>

        {revealed ? (
          <GoldButton pulse onClick={() => goToCheckout(CHECKOUT_DISCOUNT_PATH)}>
            Aprovechar este precio →
          </GoldButton>
        ) : (
          <button type="button" onClick={() => setRevealed(true)} className="text-xs text-muted underline underline-offset-4">
            Revelar sin raspar
          </button>
        )}
      </div>
    </div>
  )
}
