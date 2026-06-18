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
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const monthTx = transactions.filter((t) => t.occurred_on.startsWith(key))
    return {
      m: `${d.getUTCMonth() + 1}`,
      inc: monthTx.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
      exp: monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    }
  })
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

/* ─── shared tooltip ─── */
export function TooltipDark({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(20,22,32,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
      <p style={{ fontFamily: MONO_FONT, fontWeight: 700, color: TEXT, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: MONO_FONT, color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}
