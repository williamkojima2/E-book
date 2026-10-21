import 'server-only'
import { getCache } from '@vercel/functions'

// Meta rejects events older than 7 days, so remembering an ID longer than that is pointless.
const TTL_SECONDS = 8 * 24 * 60 * 60

const purchasesEnviadas = () => getCache({ namespace: 'purchases_enviadas' })

/** Reserva o ID da transação. Retorna false se o Purchase dessa transação já foi (ou está sendo) enviado. */
export async function claimPurchase(transactionId: string): Promise<boolean> {
  const cache = purchasesEnviadas()
  if (await cache.get(transactionId)) return false
  await cache.set(transactionId, { sentAt: Date.now() }, { ttl: TTL_SECONDS })
  return true
}

/** Libera o ID quando o envio para a Meta falha, para que um próximo webhook possa tentar de novo. */
export async function releasePurchase(transactionId: string) {
  await purchasesEnviadas().delete(transactionId)
}
