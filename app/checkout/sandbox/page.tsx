import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pago simulado — XPag sandbox', robots: { index: false } }

export default function SandboxPayPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl tracking-wide">Pago simulado</h1>
      <p className="text-muted">
        Esta es la página de pago de prueba. Vuelve a la pestaña del checkout y usa el panel de sandbox para simular el
        resultado.
      </p>
    </main>
  )
}
