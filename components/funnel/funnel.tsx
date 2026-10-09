'use client'

import { useState } from 'react'
import type { BalotoStats } from '@/lib/baloto'
import { HookScreen } from './hook-screen'
import { QuizScreen, type QuizAnswers } from './quiz-screen'
import { ResultScreen } from './result-screen'
import { SalesScreen } from './sales-screen'

type Step = 'hook' | 'quiz' | 'result' | 'sales'

export function Funnel({ stats }: { stats: BalotoStats }) {
  const [step, setStep] = useState<Step>('hook')
  const [answers, setAnswers] = useState<QuizAnswers | null>(null)

  const go = (next: Step) => {
    setStep(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-4 pb-12 pt-6">
      <header className="mb-6 flex items-baseline justify-center gap-2">
        <span className="font-display text-3xl uppercase tracking-wider">
          Lote<span className="text-gold">Smart</span>
        </span>
        <span className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-muted">Colombia</span>
      </header>

      {step === 'hook' && <HookScreen stats={stats} onContinue={() => go('quiz')} />}
      {step === 'quiz' && (
        <QuizScreen
          onComplete={(a) => {
            setAnswers(a)
            go('result')
          }}
        />
      )}
      {step === 'result' && answers && (
        <ResultScreen stats={stats} answers={answers} onContinue={() => go('sales')} />
      )}
      {step === 'sales' && <SalesScreen />}
    </main>
  )
}
