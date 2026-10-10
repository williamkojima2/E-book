'use client'

import { Check, ChevronDown, CircleHelp, CreditCard, Loader2, Lock } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { CHECKOUT_CONFIG, PRICE_BUMP, PRICE_BUMP_BEFORE } from '@/lib/config'
import { EMAIL_RE, type Offer, OFFER_PRICES, PHONE_RE } from '@/lib/pricing'
import { trackAddPaymentInfo, trackInitiateCheckoutOnce, trafficOrigin } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { createPayment, type MethodId, type PaymentItem } from './create-payment'
import { WaitingScreen } from './waiting-screen'

/** Métodos visibles en el checkout, en este orden. Agrega o quita 'card', 'nequi' o 'breb' según lo que soporte el gateway. */
export const PAYMENT_METHODS: MethodId[] = ['nequi', 'breb']

const VISIBLE_METHODS = 2
const BASE_INSTALLMENTS = [1, 2, 3, 11, 12]
const EXTRA_INSTALLMENTS = [4, 5, 6, 7, 8, 9, 10]
const MAX_INSTALLMENTS = 12
const BUMP_INSTALLMENTS = [1, 2, 3]

const BUMP_ITEMS = [
  'Combinaciones de la Semana',
  'Top 10 — el ranking de los números con mayor frecuencia histórica, actualizado',
  'Pares — los números que más y que menos salen juntos, con su frecuencia promedio',
  'Tendencia — qué números están en alza o en baja frente a su historial, según los últimos 50 sorteos',
  'Checklist Antes de Apostar — tu guía rápida en 3 etapas, con planificador de presupuesto y revisión automática de tu combinación',
  'Guía LoteSmart — cómo leer e interpretar los datos',
]

const BUMP_NAME = 'Aprovecha Ahora'

type FieldName =
  | 'email'
  | 'emailConfirm'
  | 'name'
  | 'phone'
  | 'cardNumber'
  | 'cardExpiry'
  | 'cardCvv'
  | 'cardName'
type Values = Record<FieldName, string>
type Errors = Partial<Record<FieldName | 'form', string>>
type Created = { token: string; checkoutUrl: string; sandbox: boolean }

const EMPTY: Values = {
  email: '',
  emailConfirm: '',
  name: '',
  phone: '',
  cardNumber: '',
  cardExpiry: '',
  cardCvv: '',
  cardName: '',
}

const money = (v: number) =>
  `$ ${v.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const perInstallment = (amount: number, n: number) => Math.floor(amount / n)

function readCookie(name: string) {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.split('=')[1]
}

function collectTracking() {
  const utm: Record<string, string> = {}
  new URLSearchParams(window.location.search).forEach((v, k) => {
    if (/^(utm_.+|sck|fbclid)$/.test(k)) utm[k] = v
  })
  const fbclid = utm.fbclid
  return {
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined),
    pageUrl: window.location.href,
    origin: trafficOrigin(),
    utm,
  }
}

function luhn(digits: string) {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

function validExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)
}

function validate(v: Values, method: MethodId): Errors {
  const e: Errors = {}
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Informa un email válido.'
  if (!e.email && v.emailConfirm.trim().toLowerCase() !== v.email.trim().toLowerCase()) {
    e.emailConfirm = 'Los emails no coinciden.'
  }
  if (v.name.trim().split(/\s+/).length < 2 || v.name.trim().length < 5) e.name = 'Introduce tu nombre completo.'
  if (method === 'card') {
    const digits = v.cardNumber.replace(/\D/g, '')
    if (digits.length < 13 || !luhn(digits)) e.cardNumber = 'Número de tarjeta inválido.'
    if (!validExpiry(v.cardExpiry)) e.cardExpiry = 'Fecha inválida.'
    if (!/^\d{3,4}$/.test(v.cardCvv)) e.cardCvv = 'CVV inválido.'
    if (v.cardName.trim().length < 3) e.cardName = 'Introduce el nombre del titular.'
  } else if (!PHONE_RE.test(v.phone)) {
    e.phone = 'Celular colombiano de 10 dígitos (empieza por 3).'
  }
  return e
}

function format(field: FieldName, raw: string) {
  if (field === 'phone') return raw.replace(/\D/g, '').slice(0, 10)
  if (field === 'cardNumber') {
    return raw
      .replace(/\D/g, '')
      .slice(0, 19)
      .replace(/(\d{4})(?=\d)/g, '$1 ')
  }
  if (field === 'cardExpiry') {
    const d = raw.replace(/\D/g, '').slice(0, 4)
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
  }
  if (field === 'cardCvv') return raw.replace(/\D/g, '').slice(0, 4)
  return raw
}

export function CheckoutForm({ offer }: { offer: Offer }) {
  const ids = useId()
  const price = OFFER_PRICES[offer]
  const hasCard = PAYMENT_METHODS.includes('card')
  const [values, setValues] = useState<Values>(EMPTY)
  const [method, setMethod] = useState<MethodId>(PAYMENT_METHODS[0] ?? 'nequi')
  const [showAllMethods, setShowAllMethods] = useState(false)
  const [installments, setInstallments] = useState(1)
  const [showAllInstallments, setShowAllInstallments] = useState(false)
  const [bump, setBump] = useState(false)
  const [bumpInstallments, setBumpInstallments] = useState(1)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [retryToken, setRetryToken] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const initiated = useRef(false)
  const trackedMethods = useRef(new Set<MethodId>())

  const total = price + (bump ? PRICE_BUMP : 0)

  useEffect(() => {
    if (initiated.current) return
    initiated.current = true
    trackInitiateCheckoutOnce({ value: price, currency: 'COP', content_name: CHECKOUT_CONFIG.productName })
  }, [price])

  const update = (field: FieldName, raw: string) => {
    setValues((v) => ({ ...v, [field]: format(field, raw) }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const chooseMethod = (next: MethodId) => {
    setMethod(next)
    setErrors((e) => ({ ...e, form: undefined }))
    if (!trackedMethods.current.has(next)) {
      trackedMethods.current.add(next)
      trackAddPaymentInfo({ value: total, currency: 'COP', payment_type: next })
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(values, method)
    if (Object.keys(found).length) {
      setErrors(found)
      document.getElementById(`${ids}-${Object.keys(found)[0]}`)?.focus()
      return
    }
    setErrors({})
    setSubmitting(true)
    const items: PaymentItem[] = [{ id: 'main', name: CHECKOUT_CONFIG.productName, price }]
    if (bump) items.push({ id: 'bump', name: BUMP_NAME, price: PRICE_BUMP })
    const result = await createPayment(
      {
        method,
        installments: method === 'card' ? installments : 1,
        amount: total,
        customer: {
          name: values.name.trim(),
          email: values.email.trim(),
          phone: method === 'card' ? undefined : values.phone,
        },
        items,
      },
      { offer, retryToken, tracking: collectTracking() },
    )
    if (result.ok) {
      setRetryToken(result.token)
      setCreated({ token: result.token, checkoutUrl: result.checkoutUrl, sandbox: result.sandbox })
    } else {
      setRetryToken(result.token && result.retryable ? result.token : null)
      const field = result.field as FieldName | undefined
      setErrors(field && field in values ? { [field]: result.error } : { form: result.error })
      // Mantenemos el estado "Procesando" solo mientras la solicitud está en curso.
    }
    setSubmitting(false)
  }

  const visibleMethods = showAllMethods ? PAYMENT_METHODS : PAYMENT_METHODS.slice(0, VISIBLE_METHODS)
  const installmentOptions = showAllInstallments
    ? Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1)
    : BASE_INSTALLMENTS

  return (
    <div className="flex flex-col gap-7 rounded-3xl bg-white p-6 text-neutral-700 [color-scheme:light]">
      <header className="flex gap-4">
        <Image
          src="/produto.png"
          alt="LoteSmart Colombia"
          width={120}
          height={120}
          className="size-[120px] shrink-0 rounded-lg bg-black object-cover"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl leading-tight text-neutral-950 [font-family:var(--font-fraunces)]">
            {CHECKOUT_CONFIG.productName}
          </h1>
          <p className="text-sm text-neutral-500">Autor: LoteSmart</p>
          <p className="text-[28px] leading-tight font-bold text-neutral-950">{money(price)}</p>
          {hasCard && (
            <p className="text-[15px] leading-snug text-neutral-500">
              o en {MAX_INSTALLMENTS} cuotas de {money(perInstallment(price, MAX_INSTALLMENTS))} en la tarjeta de
              crédito
            </p>
          )}
        </div>
      </header>

      {created ? (
        <WaitingScreen
          {...created}
          methodLabel={method === 'nequi' ? 'Nequi' : method === 'breb' ? 'Bre-B' : 'Tarjeta'}
          total={total}
          onRestart={() => {
            setCreated(null)
            setRetryToken(null)
          }}
        />
      ) : (
        <form noValidate onSubmit={submit} className="flex flex-col gap-7">
          <section aria-labelledby={`${ids}-personal`} className="flex flex-col gap-4">
            <SectionTitle id={`${ids}-personal`}>Datos personales</SectionTitle>
            <Field
              id={`${ids}-email`}
              label="Tu email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Informa tu email para recibir la compra"
              value={values.email}
              onChange={(v) => update('email', v)}
              error={errors.email}
            />
            <Field
              id={`${ids}-emailConfirm`}
              label="Confirma tu email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Introduce nuevamente tu email"
              value={values.emailConfirm}
              onChange={(v) => update('emailConfirm', v)}
              onPaste={(e) => e.preventDefault()}
              error={errors.emailConfirm}
            />
            <Field
              id={`${ids}-name`}
              label="Tu nombre completo"
              autoComplete="name"
              placeholder="Introduce tu nombre completo"
              value={values.name}
              onChange={(v) => update('name', v)}
              error={errors.name}
            />
          </section>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-4">
              <SectionTitle as="span">Selecciona el método de pago</SectionTitle>
            </legend>
            {visibleMethods.map((m) => (
              <div
                key={m}
                className={cn(
                  'overflow-hidden rounded-lg border',
                  method === m ? 'border-[1.5px] border-neutral-950' : 'border-neutral-300',
                )}
              >
                <label className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3">
                  <input
                    type="radio"
                    name="method"
                    value={m}
                    checked={method === m}
                    onChange={() => chooseMethod(m)}
                    className="size-5 shrink-0 accent-neutral-950"
                  />
                  <MethodLabel method={m} />
                </label>
                {method === m && (
                  <div className="flex flex-col gap-4 bg-[#F4F2EE] p-4">
                    {m === 'card' ? (
                      <CardPanel
                        ids={ids}
                        values={values}
                        errors={errors}
                        update={update}
                        price={price}
                        installments={installments}
                        setInstallments={setInstallments}
                        options={installmentOptions}
                        showAll={showAllInstallments}
                        onShowAll={() => setShowAllInstallments(true)}
                      />
                    ) : (
                      <>
                        <Field
                          id={`${ids}-phone`}
                          label={m === 'nequi' ? 'Tu celular Nequi' : 'Celular asociado a tu llave Bre-B'}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          placeholder="300 123 4567"
                          value={values.phone}
                          onChange={(v) => update('phone', v)}
                          error={errors.phone}
                        />
                        <p className="text-sm leading-relaxed text-neutral-600">
                          {m === 'nequi'
                            ? 'Al continuar se abrirá el pago para que lo apruebes en tu app Nequi.'
                            : 'Al continuar verás los datos para pagar con Bre-B desde la app de tu banco.'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!showAllMethods && PAYMENT_METHODS.length > VISIBLE_METHODS && (
              <button
                type="button"
                onClick={() => setShowAllMethods(true)}
                className="mx-auto flex items-center gap-1 py-1 text-sm font-medium text-neutral-800"
              >
                Mostrar más <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            )}
          </fieldset>

          <section aria-labelledby={`${ids}-bump`} className="flex flex-col gap-4">
            <SectionTitle id={`${ids}-bump`}>Aprovecha y compra:</SectionTitle>
            <div className="overflow-hidden rounded-lg border-[1.5px] border-[#0BB04A]">
              <div className="flex flex-col gap-4 p-4">
                <div className="flex gap-4">
                  <Image
                    src="/bonos.png"
                    alt="Bonos LoteSmart"
                    width={110}
                    height={110}
                    className="size-[110px] shrink-0 rounded-lg bg-black object-cover"
                  />
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[22px] leading-tight text-neutral-950 [font-family:var(--font-fraunces)]">
                      {BUMP_NAME}
                    </h3>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <s className="text-neutral-500">{money(PRICE_BUMP_BEFORE)}</s>
                      <span className="rounded bg-[#E8F8EE] px-1.5 py-0.5 text-xs font-semibold text-[#0BB04A]">
                        ↓ {Math.round((1 - PRICE_BUMP / PRICE_BUMP_BEFORE) * 100)}%
                      </span>
                    </p>
                    <p className="text-xl font-bold text-neutral-950">{money(PRICE_BUMP)}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2 text-sm leading-relaxed">
                  {BUMP_ITEMS.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm bg-[#0BB04A]">
                        <Check className="size-3 text-white" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {method === 'card' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${ids}-bumpInstallments`} className="text-sm font-medium text-neutral-800">
                      Selecciona el número de cuotas
                    </label>
                    <select
                      id={`${ids}-bumpInstallments`}
                      value={bumpInstallments}
                      onChange={(e) => setBumpInstallments(Number(e.target.value))}
                      className="h-[52px] rounded-lg border border-neutral-300 bg-white px-3 text-neutral-800"
                    >
                      {BUMP_INSTALLMENTS.map((n) => (
                        <option key={n} value={n}>
                          {n} cuotas de {money(perInstallment(PRICE_BUMP, n))}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-3 bg-[#E8F8EE] px-4 py-4 text-base font-semibold text-neutral-900">
                <input
                  type="checkbox"
                  checked={bump}
                  onChange={(e) => setBump(e.target.checked)}
                  className="size-6 shrink-0 accent-[#0BB04A]"
                />
                Añadir a la compra
              </label>
            </div>
          </section>

          <section aria-labelledby={`${ids}-summary`} className="flex flex-col gap-4">
            <SectionTitle id={`${ids}-summary`}>Detalles de la compra</SectionTitle>
            <dl className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-300">
              <SummaryRow label={CHECKOUT_CONFIG.productName} value={money(price)} bold />
              {bump && (
                <>
                  <SummaryRow label={BUMP_NAME} value={money(PRICE_BUMP)} />
                  <SummaryRow label="Total" value={money(total)} bold />
                </>
              )}
            </dl>
          </section>

          {errors.form && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.form}
            </p>
          )}

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-lg bg-[#0BB04A] text-[22px] font-semibold text-white transition-colors hover:bg-[#099a40] disabled:cursor-not-allowed disabled:opacity-80"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" /> Procesando...
                </>
              ) : (
                'Comprar ahora'
              )}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-sm text-neutral-500">
              <Lock className="size-4" aria-hidden="true" /> Pago 100% seguro · LoteSmart
            </p>
          </div>
        </form>
      )}
    </div>
  )
}

function SectionTitle({ id, as = 'h2', children }: { id?: string; as?: 'h2' | 'span'; children: React.ReactNode }) {
  const Tag = as
  return (
    <Tag id={id} className="block text-[22px] leading-tight text-neutral-950 [font-family:var(--font-fraunces)]">
      {children}
    </Tag>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <dt className={cn('text-neutral-900', bold && 'font-bold')}>{label}</dt>
      <dd className={cn('text-neutral-900', bold && 'font-bold')}>{value}</dd>
    </div>
  )
}

function MethodLabel({ method }: { method: MethodId }) {
  if (method === 'card') {
    return (
      <span className="flex items-center gap-2.5 font-medium text-neutral-900">
        <CreditCard className="size-5 text-neutral-700" aria-hidden="true" /> Débito / Crédito
      </span>
    )
  }
  if (method === 'nequi') {
    return (
      <span className="flex items-center gap-2.5 font-medium text-neutral-900">
        <span aria-hidden="true" className="rounded-md bg-[#200020] px-2 py-1 text-xs font-bold tracking-tight text-[#DA0081]">
          N<span className="text-white">equi</span>
        </span>
        Nequi
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2.5 font-medium text-neutral-900">
      <span aria-hidden="true" className="rounded-md bg-[#0B2A5B] px-2 py-1 text-xs font-bold tracking-tight text-white">
        Bre<span className="text-[#3FD0C9]">-B</span>
      </span>
      Bre-B
    </span>
  )
}

function CardPanel({
  ids,
  values,
  errors,
  update,
  price,
  installments,
  setInstallments,
  options,
  showAll,
  onShowAll,
}: {
  ids: string
  values: Values
  errors: Errors
  update: (field: FieldName, raw: string) => void
  price: number
  installments: number
  setInstallments: (n: number) => void
  options: number[]
  showAll: boolean
  onShowAll: () => void
}) {
  return (
    <>
      <Field
        id={`${ids}-cardNumber`}
        label="Número de la tarjeta"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        value={values.cardNumber}
        onChange={(v) => update('cardNumber', v)}
        error={errors.cardNumber}
        icon={<CreditCard className="size-5 text-neutral-400" aria-hidden="true" />}
      />
      <div className="flex gap-3">
        <div className="flex-1">
          <Field
            id={`${ids}-cardExpiry`}
            label="Fecha de vencimiento"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={values.cardExpiry}
            onChange={(v) => update('cardExpiry', v)}
            error={errors.cardExpiry}
          />
        </div>
        <div className="flex-1">
          <Field
            id={`${ids}-cardCvv`}
            label="CVV"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="Cód. de 3 o 4 dígitos"
            value={values.cardCvv}
            onChange={(v) => update('cardCvv', v)}
            error={errors.cardCvv}
            icon={<CircleHelp className="size-5 text-neutral-400" aria-hidden="true" />}
          />
        </div>
      </div>
      <Field
        id={`${ids}-cardName`}
        label="Nombre del titular"
        autoComplete="cc-name"
        placeholder="Introduce el nombre impreso en la tarjeta"
        value={values.cardName}
        onChange={(v) => update('cardName', v)}
        error={errors.cardName}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Opciones de pago en cuotas
        </legend>
        {options.map((n) => (
          <label
            key={n}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3',
              installments === n ? 'border-neutral-950' : 'border-neutral-300',
            )}
          >
            <input
              type="radio"
              name="installments"
              checked={installments === n}
              onChange={() => setInstallments(n)}
              className="size-4 shrink-0 accent-neutral-950"
            />
            <span className="flex-1 text-sm text-neutral-800">{n === 1 ? 'Pago en efectivo' : `${n} cuotas`}</span>
            <span className="text-right text-sm font-bold text-neutral-950">
              {money(perInstallment(price, n))}
              {n > 1 && <span className="font-normal text-neutral-500"> / {n} meses</span>}
            </span>
          </label>
        ))}
        {!showAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="h-11 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-neutral-800 hover:border-neutral-500"
          >
            Mostrar más opciones de pago
          </button>
        )}
      </fieldset>
    </>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  icon,
  ...props
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  icon?: React.ReactNode
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            'h-[52px] w-full rounded-lg border bg-white px-4 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-950',
            icon && 'pr-11',
            error ? 'border-red-500' : 'border-neutral-300',
          )}
          {...props}
        />
        {icon && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">{icon}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
