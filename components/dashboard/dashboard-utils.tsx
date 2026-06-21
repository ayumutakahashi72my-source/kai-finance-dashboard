import { KAI } from '@/lib/kai-tokens'
import { jstNow } from '@/lib/jst'
import type { Transaction } from '@/lib/types'

/* ─── color palette ─── */
const CAT_PALETTE = [
  '#5eead4', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb923c', '#fbbf24', '#4ade80',
  '#fb7185', '#818cf8', '#34d399', '#f59e0b',
  '#e879f9', '#38bdf8', '#a3e635',
]
export function pickColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

/* ─── design tokens ─── */
export const CORAL  = KAI.coral
export const CORALG = 'rgba(251,148,119,0.22)'
export const BLUE   = KAI.blue
export const VIOLET = KAI.violet
export const UP     = KAI.success
export const DOWN   = KAI.danger
export const AMBER  = KAI.warning
export const TEXT   = KAI.text1
export const TEXT2  = KAI.text2
export const TEXT3  = KAI.text3
export const BORDER = KAI.border2
export const PANEL  = KAI.bgPanel
export const MONO_FONT = 'var(--font-jetbrains),JetBrains Mono,monospace'

export const panel = {
  background: PANEL,
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
} as const

/* ─── formatters ─── */
export const fmt  = (n: number) => `¥${Math.abs(n).toLocaleString()}`
export const fmtK = (n: number) => `${(Math.abs(n) / 10000).toFixed(1)}万`

/* ─── data helpers ─── */
export function buildMonthlyData(transactions: Transaction[]) {
  const now = jstNow()
  const monthKeys: string[] = []
  const monthLabels: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1))
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    monthLabels.push(`${d.getUTCMonth() + 1}`)
  }

  const buckets = monthKeys.map(() => ({ inc: 0, exp: 0 }))
  const keyIndex = new Map(monthKeys.map((k, i) => [k, i]))

  for (const t of transactions) {
    const mk = t.occurred_on.slice(0, 7)
    const idx = keyIndex.get(mk)
    if (idx === undefined) continue
    if (t.amount >= 0) buckets[idx].inc += t.amount
    else buckets[idx].exp += Math.abs(t.amount)
  }

  return buckets.map((b, i) => ({ m: monthLabels[i], inc: b.inc, exp: b.exp }))
}

export type CategoryData = [string, { amount: number; color: string; icon: string | null }][]

export function buildCategoryData(transactions: Transaction[]): CategoryData {
  const expenses = transactions.filter((t) => t.amount < 0)
  const byCategory = Object.entries(
    expenses.reduce<Record<string, { amount: number; color: string; icon: string | null }>>((acc, t) => {
      const name = t.categories?.name ?? 'その他'
      const color = t.categories?.color ?? pickColor(name)
      const icon = t.categories?.icon ?? null
      acc[name] = { amount: (acc[name]?.amount ?? 0) + Math.abs(t.amount), color, icon }
      return acc
    }, {})
  ).sort((a, b) => b[1].amount - a[1].amount)
  return byCategory
}

export function buildMoMData(allTransactions: Transaction[], month: string) {
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const current = allTransactions.filter((t) => t.occurred_on.startsWith(month) && t.amount < 0)
  const prev    = allTransactions.filter((t) => t.occurred_on.startsWith(prevKey) && t.amount < 0)

  const sumByCategory = (txs: Transaction[]) =>
    txs.reduce<Record<string, number>>((acc, t) => {
      const name = t.categories?.name ?? 'その他'
      acc[name] = (acc[name] ?? 0) + Math.abs(t.amount)
      return acc
    }, {})

  const curMap  = sumByCategory(current)
  const prevMap = sumByCategory(prev)

  const names = [...new Set([...Object.keys(curMap), ...Object.keys(prevMap)])]
  return names
    .map((name) => {
      const cur  = curMap[name]  ?? 0
      const prv  = prevMap[name] ?? 0
      const diff = cur - prv
      const pct  = prv > 0 ? Math.round((diff / prv) * 100) : 0
      return { name, diff, pct, cur, prv }
    })
    .filter((r) => r.cur > 0 || r.prv > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5)
}

/* ─── payee ranking ─── */
export function buildPayeeData(transactions: Transaction[], month: string) {
  const expenses = transactions.filter((t) => t.occurred_on.startsWith(month) && t.amount < 0)
  const byPayee: Record<string, number> = {}
  for (const t of expenses) {
    const name = t.payee || 'その他'
    byPayee[name] = (byPayee[name] ?? 0) + Math.abs(t.amount)
  }
  return Object.entries(byPayee)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount]) => ({ name, amount }))
}

/* ─── daily spending pattern (day of week) ─── */
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
export function buildDailyPattern(transactions: Transaction[], month: string) {
  const expenses = transactions.filter((t) => t.occurred_on.startsWith(month) && t.amount < 0)
  const byDow = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }))
  for (const t of expenses) {
    const dow = new Date(t.occurred_on + 'T00:00:00').getDay()
    byDow[dow].total += Math.abs(t.amount)
    byDow[dow].count += 1
  }
  return byDow.map((d, i) => ({
    day: DOW_LABELS[i],
    avg: d.count > 0 ? Math.round(d.total / d.count) : 0,
    total: d.total,
    count: d.count,
  }))
}

/* ─── savings trend (monthly) ─── */
export function buildSavingsTrend(transactions: Transaction[]) {
  const now = jstNow()
  const monthKeys: string[] = []
  const monthLabels: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1))
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    monthLabels.push(`${d.getUTCMonth() + 1}`)
  }

  const buckets = monthKeys.map(() => ({ inc: 0, exp: 0 }))
  const keyIndex = new Map(monthKeys.map((k, i) => [k, i]))

  for (const t of transactions) {
    const mk = t.occurred_on.slice(0, 7)
    const idx = keyIndex.get(mk)
    if (idx === undefined) continue
    if (t.amount >= 0) buckets[idx].inc += t.amount
    else buckets[idx].exp += Math.abs(t.amount)
  }

  return buckets.map((b, i) => {
    const savings = b.inc - b.exp
    const rate = b.inc > 0 ? Math.round((savings / b.inc) * 100) : 0
    return { m: monthLabels[i], savings, rate, inc: b.inc, exp: b.exp }
  })
}

/* ─── discretionary spending trend ─── */
const DISCRETIONARY_KEYWORDS = ['趣味', '嗜好', '課金', 'サブスク', 'エンタメ', '娯楽', '遊興', 'ゲーム', '書籍', '美容']

export function buildDiscretionaryTrend(transactions: Transaction[]) {
  const now = jstNow()
  const monthKeys: string[] = []
  const monthLabels: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1))
    monthKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
    monthLabels.push(`${d.getUTCMonth() + 1}`)
  }

  const buckets = monthKeys.map(() => ({ disc: 0, allExp: 0 }))
  const keyIndex = new Map(monthKeys.map((k, i) => [k, i]))

  for (const t of transactions) {
    if (t.amount >= 0 || t.is_fixed) continue
    const mk = t.occurred_on.slice(0, 7)
    const idx = keyIndex.get(mk)
    if (idx === undefined) continue
    const abs = Math.abs(t.amount)
    buckets[idx].allExp += abs
    const catName = t.categories?.name ?? ''
    if (DISCRETIONARY_KEYWORDS.some((kw) => catName.includes(kw))) {
      buckets[idx].disc += abs
    }
  }

  return buckets.map((b, i) => ({
    m: monthLabels[i],
    total: b.disc,
    rate: b.allExp > 0 ? Math.round((b.disc / b.allExp) * 100) : 0,
    allExp: b.allExp,
  }))
}


/* ─── shared tooltip ─── */
export function TooltipDark({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: KAI.overlayBg, backdropFilter: 'blur(20px)', border: `1px solid ${KAI.borderStrong}`, borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
      <p style={{ fontFamily: MONO_FONT, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: MONO_FONT, color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}
