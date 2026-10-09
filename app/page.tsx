import { Funnel } from '@/components/funnel/funnel'
import { getBalotoStats } from '@/lib/baloto'

export const revalidate = 1800

export default async function Page() {
  const stats = await getBalotoStats()
  return <Funnel stats={stats} />
}
