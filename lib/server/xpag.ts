import 'server-only'
import { randomUUID } from 'node:crypto'
import type { PayMethod } from '@/lib/pricing'

const BASE_URL = process.env.XPAG_BASE_URL || 'https://api.xpag.global'
const SANDBOX_ID = 'xpagsandbox_00000000'
const SANDBOX_SECRET = '202620262026202620262026'

export const RETRYABLE = new Set(['provider_unavailable', 'rate_limited'])

export class XPagError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number,
  ) {
    super(message)
  }
}

export type TxStatus = 'pending' | 'confirmed' | 'expired' | 'failed' | string

export type CashinResult = {
  transactionId: string
  requestNumber: string
  status: TxStatus
  checkoutUrl: string | null
}

export type TxInfo = {
  status: TxStatus
  amount: number
  currency: string | null
  transactionId: string
  e2e: string | null
  checkoutUrl: string | null
}

export type SimulateOutcome = 'paid' | 'failed' | 'expired'

// The public sandbox key currently returns 403 invalid_account, so without real credentials we fall back
// to an in-memory mock — except in production, where a mock would let anyone "pay" via /api/dev/simulate.
const hasCredentials = Boolean(process.env.XPAG_CLIENT_ID && process.env.XPAG_CLIENT_SECRET)
const isProduction = process.env.VERCEL_ENV === 'production'
export const driver: 'mock' | 'live' =
  process.env.XPAG_DRIVER === 'live' || isProduction
    ? 'live'
    : process.env.XPAG_DRIVER === 'mock' || !hasCredentials
      ? 'mock'
      : 'live'
export const isSandbox = !isProduction && (driver === 'mock' || !hasCredentials)

type Raw = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null)

async function call(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<Raw> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    headers: {
      'X-Client-Id': process.env.XPAG_CLIENT_ID || SANDBOX_ID,
      'X-Client-Secret': process.env.XPAG_CLIENT_SECRET || SANDBOX_SECRET,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  const data = (await res.json().catch(() => ({}))) as Raw
  if (!res.ok || data.ok === false) {
    throw new XPagError(
      String(data.error ?? `XPag HTTP ${res.status}`),
      String(data.error_code ?? `http_${res.status}`),
      res.status,
    )
  }
  return data
}

function toTxInfo(d: Raw): TxInfo {
  return {
    status: String(d.status ?? 'pending'),
    amount: Number(d.amount ?? 0),
    currency: str(d.currency),
    transactionId: String(d.transaction_id ?? ''),
    e2e: str(d.e2e),
    checkoutUrl: str(d.checkout_url),
  }
}

type MockTx = TxInfo & { externalId: string; createdAt: number; appUrl: string }
const mockStore = ((globalThis as { __xpagMock?: Map<string, MockTx> }).__xpagMock ??= new Map())

export async function createCashin(input: {
  method: PayMethod
  amount: number
  phone: string
  externalId: string
  webhookUrl: string
  appUrl: string
}): Promise<CashinResult> {
  if (driver === 'mock') {
    if (!/^3\d{9}$/.test(input.phone)) throw new XPagError('Celular inválido', 'phone_required', 422)
    if (input.amount < 10_000) throw new XPagError('Monto mínimo', 'amount_below_min', 422)
    const existing = [...mockStore.values()].find((t) => t.externalId === input.externalId)
    const tx: MockTx = existing ?? {
      transactionId: `cop_mock_${randomUUID().slice(0, 12)}`,
      externalId: input.externalId,
      status: 'pending',
      amount: input.amount,
      currency: 'COP',
      e2e: null,
      checkoutUrl: null,
      createdAt: Date.now(),
      appUrl: input.appUrl,
    }
    mockStore.set(tx.transactionId, tx)
    return { transactionId: tx.transactionId, requestNumber: tx.transactionId, status: tx.status, checkoutUrl: null }
  }

  const d = await call('/cashin', {
    method: 'POST',
    body: {
      currency: 'COP',
      method: input.method,
      amount: input.amount,
      phone: input.phone,
      external_id: input.externalId,
      generateCheckout: true,
      webhook_url: input.webhookUrl,
    },
  })
  return {
    transactionId: String(d.transaction_id ?? ''),
    requestNumber: String(d.request_number ?? ''),
    status: String(d.status ?? 'pending'),
    checkoutUrl: str(d.checkout_url),
  }
}

export async function consultTransaction(transactionId: string): Promise<TxInfo> {
  if (driver === 'mock') {
    const tx = mockStore.get(transactionId)
    if (!tx) throw new XPagError('No encontrado', 'deposit_not_found', 404)
    if (!tx.checkoutUrl && Date.now() - tx.createdAt > 1500) {
      tx.checkoutUrl = `${tx.appUrl}/checkout/sandbox?tx=${encodeURIComponent(tx.transactionId)}`
    }
    return { ...tx }
  }
  return toTxInfo(await call(`/consult-transaction?transaction_id=${encodeURIComponent(transactionId)}`, { method: 'GET' }))
}

/** Devuelve el evento de webhook en modo mock para procesarlo localmente; en vivo XPag lo envía a webhook_url. */
export async function simulate(transactionId: string, outcome: SimulateOutcome): Promise<Raw | null> {
  if (driver === 'mock') {
    const tx = mockStore.get(transactionId)
    if (!tx) throw new XPagError('No encontrado', 'deposit_not_found', 404)
    tx.status = outcome === 'paid' ? 'confirmed' : outcome
    if (outcome === 'paid') tx.e2e = `E${randomUUID().replaceAll('-', '').slice(0, 24)}`
    return {
      type: 'cashin',
      status: tx.status,
      amount: tx.amount,
      currency: 'COP',
      transaction_id: tx.transactionId,
      request_number: tx.transactionId,
      external_id: tx.externalId,
      e2e: tx.e2e,
      provider: 'XPag',
    }
  }
  await call('/sandbox/simulate', { method: 'POST', body: { transaction_id: transactionId, outcome } })
  return null
}
