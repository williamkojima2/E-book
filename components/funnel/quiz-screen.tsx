'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { track } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { GoldButton } from './shared'

export type QuizAnswers = number[][]

type Question = { title: string; options: string[]; multiple?: boolean }

export const QUESTIONS: Question[] = [
  {
    title: '¿Hace cuánto tiempo juegas Baloto, Revancha o Miloto?',
    options: ['Apenas empecé', 'Menos de 1 año', '1 a 3 años', 'Más de 3 años'],
  },
  {
    title: '¿Cuánto sueles gastar al mes en tus apuestas?',
    options: ['Menos de $20.000', '$20.000 - $50.000', '$50.000 - $100.000', 'Más de $100.000'],
  },
  {
    title: '¿Cómo eliges tus números normalmente?',
    options: ['Fechas importantes', 'Números de la suerte', 'Al azar', 'Combinaciones repetidas'],
    multiple: true,
  },
  {
    title: '¿Alguna vez has ganado algún premio?',
    options: ['Nunca', 'Premios pequeños', 'Un premio grande', 'Prefiero no decir'],
  },
  {
    title: '¿Te gustaría conocer una forma de consultar datos históricos antes de jugar?',
    options: ['Sí, claro', 'Tal vez', 'No estoy seguro'],
  },
]

export function QuizScreen({ onComplete }: { onComplete: (answers: QuizAnswers) => void }) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswers>(() => QUESTIONS.map(() => []))
  const question = QUESTIONS[index]
  const selected = answers[index]
  const progress = ((index + (selected.length ? 1 : 0)) / QUESTIONS.length) * 100

  const toggle = (option: number) => {
    setAnswers((prev) => {
      const next = [...prev]
      if (question.multiple) {
        next[index] = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]
      } else {
        next[index] = [option]
      }
      return next
    })
  }

  const advance = () => {
    if (!selected.length) return
    if (index < QUESTIONS.length - 1) {
      setIndex(index + 1)
      return
    }
    track('Lead', { content_name: 'Quiz completado' })
    onComplete(answers)
  }

  return (
    <section aria-labelledby="quiz-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm text-muted">
          <span>
            Pregunta {index + 1} de {QUESTIONS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Progreso del test"
          className="h-2 overflow-hidden rounded-full bg-card-2"
        >
          <div className="btn-gold h-full rounded-full transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <fieldset key={index} className="animate-pop flex flex-col gap-4">
        <legend id="quiz-title" className="mb-4 text-balance font-display text-4xl leading-none tracking-wide">
          {question.title}
        </legend>
        {question.multiple && <p className="-mt-2 text-sm text-muted">Puedes elegir varias opciones.</p>}
        <div className="flex flex-col gap-3" role={question.multiple ? 'group' : 'radiogroup'}>
          {question.options.map((option, i) => {
            const active = selected.includes(i)
            return (
              <button
                key={option}
                type="button"
                role={question.multiple ? 'checkbox' : 'radio'}
                aria-checked={active}
                onClick={() => toggle(i)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left text-lg transition-colors',
                  active ? 'border-gold bg-gold/10 text-ink' : 'border-line bg-card hover:border-gold/50',
                )}
              >
                <span>{option}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center border-2',
                    question.multiple ? 'rounded-md' : 'rounded-full',
                    active ? 'border-gold bg-gold text-[#1a1404]' : 'border-line',
                  )}
                >
                  {active && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <GoldButton onClick={advance} disabled={!selected.length}>
        {index < QUESTIONS.length - 1 ? 'Continuar' : 'Ver mi resultado'}
      </GoldButton>

      {index > 0 && (
        <button type="button" onClick={() => setIndex(index - 1)} className="text-sm text-muted underline-offset-4 hover:underline">
          ← Pregunta anterior
        </button>
      )}
    </section>
  )
}

const POINTS = [
  [0, 3, 6, 9],
  [0, 3, 6, 9],
  [2, 2, 2, 2],
  [6, 4, 2, 3],
  [8, 5, 3],
]

export function scoreAnswers(answers: QuizAnswers) {
  const total = answers.reduce(
    (sum, picked, q) => sum + picked.reduce((s, option) => s + (POINTS[q][option] ?? 0), 0),
    62,
  )
  return Math.min(97, total)
}
