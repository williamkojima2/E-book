import fallback from '@/data/baloto.json'
import { DATA_SOURCE_URL, FREQUENCY_WINDOW } from '@/lib/config'

export type Draw = { id: number; date: string; numbers: number[]; superBalota: number }

export type Heat = 'caliente' | 'tibio' | 'frio'

export type NumberStat = { number: number; count: number; heat: Heat }

export type BalotoStats = {
  windowSize: number
  lastDrawDate: string
  nextDrawDate: string
  hottest: NumberStat
  row: NumberStat[]
  hottestSuper: { number: number; count: number }
  legendary: NumberStat
  rare: NumberStat
  cold: { number: number; drawsSince: number }
  history: { number: number; count: number; trend: 'up' | 'down' | 'flat' }[]
  historyDraws: number
  pairs: { a: number; b: number; count: number }[]
}

const MAX_NUMBER = 43
const MAX_SUPER = 16
const DRAW_WEEKDAYS = [1, 3, 6]

async function loadDraws(): Promise<Draw[]> {
  try {
    const res = await fetch(DATA_SOURCE_URL, { next: { revalidate: 1800 } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const draws: Draw[] = json?.games?.baloto
    if (!Array.isArray(draws) || draws.length < FREQUENCY_WINDOW) throw new Error('Datos insuficientes')
    return draws
  } catch {
    return (fallback as { draws: Draw[] }).draws
  }
}

function sortByDateDesc(draws: Draw[]) {
  return [...draws].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
}

function countNumbers(draws: Draw[]) {
  const counts = new Map<number, number>()
  for (let n = 1; n <= MAX_NUMBER; n++) counts.set(n, 0)
  for (const d of draws) for (const n of d.numbers) counts.set(n, (counts.get(n) ?? 0) + 1)
  return counts
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function nextDrawAfter(date: string) {
  const bogotaToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  let cursor = date > bogotaToday ? date : bogotaToday
  if (cursor === date) cursor = addDays(cursor, 1)
  for (let i = 0; i < 8; i++) {
    const weekday = new Date(`${cursor}T12:00:00Z`).getUTCDay()
    if (DRAW_WEEKDAYS.includes(weekday)) return cursor
    cursor = addDays(cursor, 1)
  }
  return cursor
}

export async function getBalotoStats(): Promise<BalotoStats> {
  const all = sortByDateDesc(await loadDraws())
  const windowDraws = all.slice(0, FREQUENCY_WINDOW)
  const counts = countNumbers(windowDraws)

  const ranked = [...counts.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count || a.number - b.number)

  const third = Math.ceil(ranked.length / 3)
  const heatOf = (index: number): Heat => (index < third ? 'caliente' : index < third * 2 ? 'tibio' : 'frio')
  const withHeat: NumberStat[] = ranked.map((r, i) => ({ ...r, heat: heatOf(i) }))

  const mid = Math.floor(withHeat.length / 2)
  const row = [withHeat[1], withHeat[2], withHeat[mid - 1], withHeat[mid + 1], withHeat[withHeat.length - 1]]

  const superCounts = new Map<number, number>()
  for (let n = 1; n <= MAX_SUPER; n++) superCounts.set(n, 0)
  for (const d of windowDraws) superCounts.set(d.superBalota, (superCounts.get(d.superBalota) ?? 0) + 1)
  const [superNumber, superCount] = [...superCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]

  const lastSeen = new Map<number, number>()
  all.forEach((d, i) => {
    for (const n of d.numbers) if (!lastSeen.has(n)) lastSeen.set(n, i)
  })
  let cold = { number: 1, drawsSince: -1 }
  for (let n = 1; n <= MAX_NUMBER; n++) {
    const since = lastSeen.get(n) ?? all.length
    if (since > cold.drawsSince) cold = { number: n, drawsSince: since }
  }

  const lastDrawDate = all[0].date
  const yearAgo = addDays(lastDrawDate, -365)
  const halfYearAgo = addDays(lastDrawDate, -182)
  const yearDraws = all.filter((d) => d.date > yearAgo)
  const recentHalf = countNumbers(yearDraws.filter((d) => d.date > halfYearAgo))
  const olderHalf = countNumbers(yearDraws.filter((d) => d.date <= halfYearAgo))
  const yearCounts = countNumbers(yearDraws)
  const history = [...yearCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 3)
    .map(([number, count]) => {
      const diff = (recentHalf.get(number) ?? 0) - (olderHalf.get(number) ?? 0)
      return { number, count, trend: diff > 1 ? ('up' as const) : diff < -1 ? ('down' as const) : ('flat' as const) }
    })

  const pairCounts = new Map<string, number>()
  for (const d of yearDraws) {
    const nums = [...d.numbers].sort((a, b) => a - b)
    for (let i = 0; i < nums.length; i++)
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
      }
  }
  const pairs = [...pairCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key, count]) => {
      const [a, b] = key.split('-').map(Number)
      return { a, b, count }
    })

  return {
    windowSize: windowDraws.length,
    lastDrawDate,
    nextDrawDate: nextDrawAfter(lastDrawDate),
    hottest: withHeat[0],
    row,
    hottestSuper: { number: superNumber, count: superCount },
    legendary: withHeat[0],
    rare: withHeat[mid],
    cold,
    history,
    historyDraws: yearDraws.length,
    pairs,
  }
}
