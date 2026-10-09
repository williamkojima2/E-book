'use client'

import { ExternalLink, FlaskConical, Loader2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

type StatusResponse = { ok: boolean; status: 'pending' | 'paid' | 'expired' | 'failed' }

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<StatusResponse>)

const money = (v: number) =>
  `$ ${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const greenButton =
  'flex h-16 w-full items-center justify-center gap-2 rounded-lg bg-[#0BB04A] text-[22px] font-semibold text-white transition-colors hover:bg-[#099a40]'

export function WaitingScreen({
  token,
  checkoutUrl,
  sandbox,
  methodLabel,
  total,
  onRestart,
}: {
  token: string
  checkoutUrl: string
  sandbox: boolean
  methodLabel: string
  total: number
  onRestart: () => void
}) {
  const router = useRouter()
  const statusUrl = `/api/order-status?t=${encodeURIComponent(token)}`
  const { data, mutate } = useSWR(statusUrl, fetcher, {
    refreshInterval: (latest) => (latest?.status && latest.status !== 'pending' ? 0 : 4000),
    revalidateOnFocus: true,
  })
  const status = data?.status ?? 'pending'

  useEffect(() => {
    if (status === 'paid') router.replace(`/gracias?t=${encodeURIComponent(token)}`)
  }, [status, token, router])

  if (status === 'expired' || status === 'failed') {
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-4 text-center">
        <XCircle className="size-12 text-red-500" aria-hidden="true" />
        <h2 className="text-2xl text-neutral-950 [font-family:var(--font-fraunces)]">
          {status === 'expired' ? 'El pago expiró' : 'El pago no se completó'}
        </h2>
        <p className="text-neutral-600">No se realizó ningún cobro. Puedes generar un nuevo pago en un clic.</p>
        <button type="button" onClick={onRestart} className={greenButton}>
          Intentar de nuevo
        </button>
      </section>
    )
  }

  return (
    <section aria-labelledby="wait-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 text-center">
        <h2 id="wait-title" className="text-[26px] leading-tight text-neutral-950 [font-family:var(--font-fraunces)]">
          Tu pago está listo
        </h2>
        <p className="text-neutral-600">
          Total: <span className="font-bold text-neutral-950">{money(total)}</span> · {methodLabel}
        </p>
        <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className={greenButton}>
          Ir a pagar <ExternalLink className="size-5" aria-hidden="true" />
        </a>
        <p className="text-pretty leading-relaxed text-neutral-700">
          Completa el pago en la ventana que se abre y vuelve a esta pestaña: apenas se confirme te llevamos
          automáticamente a tu página de acceso. No cierres esta página.
        </p>
        <p aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-neutral-500">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Esperando confirmación del pago…
        </p>
      </div>

      {sandbox && <SandboxPanel token={token} onDone={() => mutate()} />}
    </section>
  )
}

function SandboxPanel({ token, onDone }: { token: string; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (outcome: 'paid' | 'failed' | 'expired') => {
    setBusy(outcome)
    setMessage(null)
    try {
      const res = await fetch('/api/dev/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, outcome }),
      })
      const data = await res.json()
      setMessage(data.ok ? `Simulado: ${outcome}` : (data.error ?? 'Error'))
      onDone()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-violet-400 bg-violet-50 p-4">
      <p className="flex items-center gap-2 text-sm text-violet-700">
        <FlaskConical className="size-4" aria-hidden="true" /> Modo sandbox · solo visible en pruebas
      </p>
      <div className="flex flex-wrap gap-2">
        {(['paid', 'failed', 'expired'] as const).map((o) => (
          <button
            key={o}
            type="button"
            disabled={busy !== null}
            onClick={() => run(o)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 hover:border-violet-500 disabled:opacity-50"
          >
            {busy === o ? 'Simulando…' : `Simular ${o}`}
          </button>
        ))}
      </div>
      {message && <p className="text-xs text-neutral-600">{message}</p>}
    </div>
  )
}
