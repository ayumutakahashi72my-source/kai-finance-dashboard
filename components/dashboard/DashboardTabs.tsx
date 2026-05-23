'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { GoalBanner } from '@/components/dashboard/GoalBanner'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import type { FinancialGoal } from '@/components/dashboard/GoalProgressCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Icon } from '@/components/kai/shared'
import { useCountUp } from '@/components/kai/hooks'
import { KAI, yen } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

/* ─── category color fallback (same palette as server-side pickCategoryColor) ─── */
const CAT_PALETTE = [
  '#5eead4', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb923c', '#fbbf24', '#4ade80',
  '#fb7185', '#818cf8', '#34d399', '#f59e0b',
  '#e879f9', '#38bdf8', '#a3e635',
]
function pickColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

/* ─── design tokens ─── */
const CORAL  = KAI.coral
const CORALG = 'rgba(251,148,119,0.22)'
const BLUE   = KAI.blue
const VIOLET = KAI.violet
const UP     = KAI.success
const DOWN   = KAI.danger
const AMBER  = KAI.warning
const TEXT   = KAI.text1
const TEXT2  = KAI.text2
const TEXT3  = KAI.text3
const BORDER = KAI.border2
const PANEL  = KAI.bgPanel

const panel = {
  background: PANEL,
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
} as const

const fmt  = (n: number) => `¥${Math.abs(n).toLocaleString()}`
const fmtK = (n: number) => `${(Math.abs(n) / 10000).toFixed(1)}万`

/* ─── helpers ─── */
function buildMonthlyData(transactions: Transaction[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthTx = transactions.filter((t) => t.occurred_on.startsWith(key))
    return {
      m: `${d.getMonth() + 1}`,
      inc: monthTx.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
      exp: monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    }
  })
}

function buildCategoryData(transactions: Transaction[]) {
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

function buildMoMData(allTransactions: Transaction[], month: string) {
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

  const curMap = sumByCategory(current)
  const prevMap = sumByCategory(prev)

  const names = [...new Set([...Object.keys(curMap), ...Object.keys(prevMap)])]
  return names
    .map((name) => {
      const cur = curMap[name] ?? 0
      const prv = prevMap[name] ?? 0
      const diff = cur - prv
      const pct = prv > 0 ? Math.round((diff / prv) * 100) : 0
      return { name, diff, pct, cur, prv }
    })
    .filter((r) => r.cur > 0 || r.prv > 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 5)
}

/* ─── shared tooltip ─── */
function TooltipDark({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(20,22,32,0.92)', backdropFilter: 'blur(20px)', border: `1px solid rgba(255,255,255,0.16)`, borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
      <p style={{ fontFamily: 'var(--font-mono),monospace', fontWeight: 700, color: TEXT, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontFamily: 'var(--font-mono),monospace', color: p.color, marginBottom: 2 }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  )
}

/* ─── Donut arc helpers ─── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg
  if (sweep >= 359.9) {
    // Full circle rendered as two arcs to avoid degenerate path
    const o1 = polarToCartesian(cx, cy, outerR, 0)
    const o2 = polarToCartesian(cx, cy, outerR, 179.9)
    const i1 = polarToCartesian(cx, cy, innerR, 179.9)
    const i2 = polarToCartesian(cx, cy, innerR, 0)
    return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 1 1 ${o2.x} ${o2.y} A ${outerR} ${outerR} 0 1 1 ${o1.x} ${o1.y} M ${i2.x} ${i2.y} A ${innerR} ${innerR} 0 1 0 ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 1 0 ${i2.x} ${i2.y} Z`
  }
  const large = sweep > 180 ? 1 : 0
  const o1 = polarToCartesian(cx, cy, outerR, startDeg)
  const o2 = polarToCartesian(cx, cy, outerR, endDeg)
  const i1 = polarToCartesian(cx, cy, innerR, endDeg)
  const i2 = polarToCartesian(cx, cy, innerR, startDeg)
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

/* ─── Category Donut Hero ─── */
const VB = 200
const CX = VB / 2
const CY = VB / 2
const OUTER_R = 88
const INNER_R  = 62
const MONO_FONT = 'var(--font-jetbrains),JetBrains Mono,monospace'

function CategoryRingHero({ transactions }: { transactions: Transaction[] }) {
  const [hovered,  setHovered]  = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const active = hovered ?? selected

  const cats = buildCategoryData(transactions)
  const totalExpense  = cats.reduce((s, [, { amount }]) => s + amount, 0)
  const totalAnimated = useCountUp(totalExpense, { duration: 1400 })

  const now2     = new Date()
  const daysLeft = new Date(now2.getFullYear(), now2.getMonth() + 1, 0).getDate() - now2.getDate()

  const top5 = cats.slice(0, 5)
  const restAmount = cats.slice(5).reduce((s, [, { amount }]) => s + amount, 0)
  const segments: [string, { amount: number; color: string }][] = [
    ...top5,
    ...(restAmount > 0 ? [['その他', { amount: restAmount, color: '#5e5e72' }] as [string, { amount: number; color: string }]] : []),
  ]

  const GAP_DEG = segments.length > 1 ? 2.5 : 0
  let cumDeg = 0
  const arcs = segments.map(([name, { amount, color }]) => {
    const frac     = totalExpense > 0 ? amount / totalExpense : 0
    const spanDeg  = frac * 360
    const startDeg = cumDeg + GAP_DEG / 2
    const endDeg   = cumDeg + spanDeg - GAP_DEG / 2
    cumDeg += spanDeg
    return { name, amount, color, startDeg, endDeg, pct: Math.round(frac * 100) }
  })

  const activeArc  = active ? arcs.find((a) => a.name === active) : null
  const displayAmt = activeArc?.amount ?? totalExpense
  const displayLbl = activeArc?.name ?? '今月の支出'
  const displayClr = activeArc?.color ?? CORAL
  const displayPct = activeArc?.pct ?? null
  const amtStr     = activeArc ? yen(displayAmt) : yen(totalAnimated)

  return (
    <div style={{ ...panel, padding: '14px 16px', animation: 'kai-rise .8s ease-out both' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: TEXT3, fontWeight: 700, letterSpacing: '.08em' }}>カテゴリ別支出</p>
        <p style={{ fontSize: 9, color: KAI.text4, fontFamily: MONO_FONT }}>残り {daysLeft}日</p>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {/* SVG donut */}
        <div style={{ flexShrink: 0 }}>
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: 148, height: 148, display: 'block' }}
            aria-hidden="true"
          >
            {/* track */}
            <circle cx={CX} cy={CY} r={(OUTER_R + INNER_R) / 2} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={OUTER_R - INNER_R} />

            {/* segments */}
            {totalExpense === 0 ? (
              <circle cx={CX} cy={CY} r={(OUTER_R + INNER_R) / 2} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={OUTER_R - INNER_R} />
            ) : arcs.map(({ name, color, startDeg, endDeg }) => (
              <path
                key={name}
                d={donutArcPath(CX, CY, OUTER_R, INNER_R, startDeg, endDeg)}
                fill={color}
                opacity={active && active !== name ? 0.18 : 1}
                style={{ cursor: 'pointer', transition: 'opacity .18s' }}
                onMouseEnter={() => setHovered(name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected((p) => (p === name ? null : name))}
              />
            ))}

            {/* center text */}
            {totalExpense === 0 ? (
              <text x={CX} y={CY + 5} textAnchor="middle" fontSize="11" fill={TEXT3}>データなし</text>
            ) : (
              <>
                <text x={CX} y={CY - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill={displayClr} letterSpacing="0.4" style={{ transition: 'fill .18s' }}>
                  {displayLbl.length > 10 ? `${displayLbl.slice(0, 10)}…` : displayLbl}
                </text>
                <text x={CX} y={CY + 12} textAnchor="middle" fontSize="20" fontWeight="800" fill={TEXT} fontFamily={MONO_FONT} letterSpacing="-0.5">
                  {amtStr}
                </text>
                <text x={CX} y={CY + 28} textAnchor="middle" fontSize="10" fontWeight="700" fill={displayPct !== null ? displayClr : KAI.text4} style={{ transition: 'fill .18s' }}>
                  {displayPct !== null ? `${displayPct}%` : '今月'}
                </text>
              </>
            )}
          </svg>
        </div>

        {/* legend — 縦並び */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          {arcs.map(({ name, color, pct, amount }) => (
            <button
              key={name}
              type="button"
              onClick={() => setSelected((p) => (p === name ? null : name))}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: active === name ? `${color}12` : 'none',
                border: active === name ? `1px solid ${color}30` : '1px solid transparent',
                borderRadius: 8, padding: '4px 6px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'all .15s', width: '100%',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0, display: 'inline-block', opacity: active && active !== name ? 0.3 : 1, transition: 'opacity .18s' }} />
              <span style={{ fontSize: 11, color: active === name ? color : TEXT2, fontWeight: active === name ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color .18s' }}>
                {name}
              </span>
              <span style={{ fontSize: 10, color: active === name ? color : TEXT3, fontFamily: MONO_FONT, flexShrink: 0, transition: 'color .18s' }}>
                {active === name ? yen(amount) : `${pct}%`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Desktop KPI card (sparkline) ─── */
function DesktopKpiCard({
  label, value, unit, delta, deltaGood, color, series, delay = 0,
}: {
  label: string; value: string; unit?: string
  delta: string; deltaGood: boolean; color: string; series: number[]; delay?: number
}) {
  const W = 76, H = 26
  const max = Math.max(...series, 1)
  const min = Math.min(...series)
  const pts = series.map((v, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * W
    const y = max === min ? H / 2 : H - ((v - min) / (max - min)) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <div style={{ ...panel, borderRadius: 16, padding: '16px 18px', animation: `kai-rise .5s ${delay}s ease-out both` }}>
      <div style={{ fontSize: 9.5, color: TEXT3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-.02em' }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: TEXT3, marginLeft: 3 }}>{unit}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: deltaGood ? UP : DOWN }}>
          <Icon name={deltaGood ? 'arrowDown' : 'arrowUp'} size={10} stroke={2.5}/>
          {delta}
          <span style={{ color: TEXT3, fontWeight: 400, marginLeft: 3 }}>vs 先月</span>
        </div>
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}

/* ─── Desktop recent transactions ─── */
function DesktopRecentTx({ transactions }: { transactions: Transaction[] }) {
  const recent = [...transactions]
    .sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
    .slice(0, 9)
  return (
    <div style={{ ...panel, borderRadius: 18, padding: '18px 16px', animation: 'kai-rise .5s .18s ease-out both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>最近の取引</div>
        <div style={{ fontSize: 10, color: TEXT3, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }}>{transactions.length} 件</div>
      </div>
      {recent.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: TEXT3 }}>取引データなし</div>
      ) : recent.map((t, i) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '8px 0',
          borderBottom: i < recent.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
          animation: `kai-rise .3s ${.08 + i * .025}s ease-out both`,
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${t.categories?.color ?? pickColor(t.categories?.name ?? '')}18`, border: `1px solid ${t.categories?.color ?? pickColor(t.categories?.name ?? '')}2a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {t.categories?.icon
              ? <CategoryIcon name={t.categories.icon} size={14} color={t.categories?.color ?? TEXT3} />
              : <span style={{ fontSize: 14, color: TEXT3 }}>·</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: TEXT2, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.payee}</div>
            <div style={{ fontSize: 10, color: TEXT3, marginTop: 1, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }}>
              {t.occurred_on.slice(5)} · {t.categories?.name ?? 'その他'}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 12.5, fontWeight: 700, color: t.amount < 0 ? DOWN : UP, flexShrink: 0 }}>
            {t.amount < 0 ? '−' : '+'}¥{Math.abs(t.amount).toLocaleString('ja-JP')}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Desktop category rank card ─── */
function DesktopCategoryCard({ transactions }: { transactions: Transaction[] }) {
  const byCategory = buildCategoryData(transactions)
  const total = byCategory.reduce((s, [, { amount }]) => s + amount, 0)
  const top6 = byCategory.slice(0, 6)
  return (
    <div style={{ ...panel, borderRadius: 18, padding: '18px 16px', animation: 'kai-rise .5s .08s ease-out both' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 14 }}>カテゴリ別支出</div>
      {top6.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: TEXT3 }}>データなし</div>
      ) : top6.map(([name, { amount, color }], i) => {
        const pct = total > 0 ? (amount / total) * 100 : 0
        return (
          <div key={name} style={{ marginBottom: i < top6.length - 1 ? 12 : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11.5, color: TEXT2, fontWeight: 500 }}>{name}</span>
              <span style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 11, color: TEXT, fontWeight: 600 }}>
                ¥{amount.toLocaleString('ja-JP')} <span style={{ color: TEXT3 }}>· {Math.round(pct)}%</span>
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Today's transactions card ─── */
function TodayCard({ transactions }: { transactions: Transaction[] }) {
  const now = new Date()
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayTx    = transactions.filter((t) => t.occurred_on.startsWith(todayKey) && t.amount < 0)
  const todayCount = transactions.filter((t) => t.occurred_on.startsWith(todayKey)).length
  const todayTotal = todayTx.reduce((s, t) => s + Math.abs(t.amount), 0)
  const todayAnim  = useCountUp(todayTotal, { duration: 1100, delay: 600 })

  return (
    <section
      style={{
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 14, padding: '10px 12px',
        animation: 'kai-rise .6s .25s ease-out both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 10, color: TEXT3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>今日</span>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', color: TEXT, letterSpacing: '-.02em' }}>{yen(todayAnim)}</span>
          <span style={{ fontSize: 10, color: KAI.text4 }}>· {todayCount}件</span>
        </div>
        <span style={{ fontSize: 10, color: CORAL, fontWeight: 600 }}>詳細 ›</span>
      </div>

      {todayTx.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <p style={{ fontSize: 12, color: TEXT3 }}>今日の記録はまだありません</p>
          <p style={{ fontSize: 11, color: KAI.text5, marginTop: 4 }}>+ 追加から記録しよう</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {todayTx.slice(0, 4).map((t, i) => (
            <div
              key={t.id}
              style={{ display: 'flex', alignItems: 'center', gap: 9, animation: `kai-rise .35s ${.35 + i * .05}s ease-out both` }}
            >
              <div
                style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: `${t.categories?.color ?? TEXT3}1c`,
                  border: `1px solid ${t.categories?.color ?? TEXT3}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {t.categories?.icon
                  ? <CategoryIcon name={t.categories.icon} size={12} color={t.categories?.color ?? TEXT3} />
                  : <span style={{ fontSize: 11, color: TEXT3 }}>·</span>}
              </div>
              <span style={{ flex: 1, fontSize: 11.5, color: TEXT2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.payee}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', letterSpacing: '-.01em', minWidth: 42, textAlign: 'right' }}>
                ¥{Math.abs(t.amount).toLocaleString('ja-JP')}
              </span>
            </div>
          ))}
          {todayTx.length > 4 && (
            <p style={{ fontSize: 11, color: TEXT3, textAlign: 'center', paddingTop: 4 }}>+{todayTx.length - 4}件</p>
          )}
        </div>
      )}
    </section>
  )
}

/* ─── Category chip (single cell) ─── */
function CategoryChipItem({ name, value, total, color, icon, idx }: { name: string; value: number; total: number; color: string; icon: string | null; idx: number }) {
  const pct = Math.min(100, (value / Math.max(total, 1)) * 100)
  const animatedPct = useCountUp(pct, { duration: 1200, delay: 400 + idx * 80 })

  return (
    <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon ? <CategoryIcon name={icon} size={12} color={color} /> : <span style={{ color, fontSize: 11 }}>·</span>}
        </div>
        <span style={{ fontSize: 12, color: '#e8e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', color: TEXT, letterSpacing: '-.01em' }}>
        ¥{value.toLocaleString('ja-JP')}
      </div>
      <div style={{ marginTop: 6, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, animatedPct)}%`, background: color, borderRadius: 99 }}/>
      </div>
      <div style={{ fontSize: 9, color: KAI.text4, marginTop: 3, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }}>
        / {Math.round(pct)}% of total
      </div>
    </div>
  )
}

/* ─── Category chips 2×2 ─── */
function CategoryChips({ transactions }: { transactions: Transaction[] }) {
  const byCategory = buildCategoryData(transactions)
  const total = byCategory.reduce((s, [, { amount }]) => s + amount, 0)
  const top4  = byCategory.slice(0, 4)

  if (total === 0) return null

  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .6s .35s ease-out both' }}>
      {top4.map(([name, { amount, color, icon }], i) => (
        <CategoryChipItem key={name} name={name} value={amount} total={total} color={color} icon={icon} idx={i}/>
      ))}
    </section>
  )
}

/* ─── Streak card ─── */
function StreakCard({ streak }: { streak: number }) {
  const bars = Array.from({ length: 8 }, (_, i) => i < streak)
  return (
    <div
      className="kai-rise rounded-[18px] p-4"
      style={{ background: 'linear-gradient(135deg,rgba(251,148,119,0.10),rgba(20,22,32,0.66))', backdropFilter: 'blur(24px) saturate(160%)', border: '1px solid rgba(251,148,119,0.22)', animationDelay: '200ms', borderRadius: 18 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 12, color: TEXT3, letterSpacing: '.08em', fontWeight: 700 }}>連続記録</p>
          <p style={{ fontFamily: 'var(--font-mono),monospace', marginTop: 4, fontSize: 28, fontWeight: 700, color: CORAL, textShadow: '0 0 20px rgba(251,148,119,.32)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="22" height="24" viewBox="0 0 12 14" fill="none"><path d="M6 1C6 1 9.5 4.5 9.5 7.5C9.5 9.5 8 11 6 11C4 11 2.5 9.5 2.5 7.5C2.5 5.5 4 3.5 4 3.5C4 3.5 4.5 5 5.5 5C5.5 5 5.5 3 6 1Z" stroke={CORAL} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill={`${CORAL}22`}/></svg>
            {streak}<span style={{ fontSize: 14, color: TEXT2, marginLeft: 2 }}>日</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {bars.map((on, i) => (
            <div key={i} style={{ width: 16, height: 26, borderRadius: 4, background: on ? CORAL : 'rgba(255,255,255,.05)', boxShadow: on ? `0 0 8px ${CORAL}66` : 'none', border: on ? 'none' : '1px dashed rgba(255,255,255,.10)' }} />
          ))}
        </div>
      </div>
      <p style={{ fontSize: 13, color: TEXT3, marginTop: 8 }}>
        {streak > 0 ? `${streak}日連続で家計記録中` : '今日の記録をつけよう'}
      </p>
    </div>
  )
}

/* ─── KPI row ─── */
function DashKpiRow({ transactions }: { transactions: Transaction[] }) {
  const income  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const ratio   = income > 0 ? Math.round((expense / income) * 100) : 0
  const ratioColor = ratio > 100 ? DOWN : ratio > 80 ? AMBER : CORAL

  return (
    <div className="kai-rise" style={{ animationDelay: '160ms' }}>
      <div className="rounded-[18px] p-4" style={panel}>
        <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700 }}>支出 / 収入</p>
        <p style={{ fontFamily: 'var(--font-mono),monospace', marginTop: 6, fontSize: 24, fontWeight: 700, color: ratioColor }}>
          {ratio}<span style={{ fontSize: 14, color: TEXT3 }}>%</span>
        </p>
        <div style={{ height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(ratio, 100)}%`, height: '100%', background: ratioColor, boxShadow: `0 0 8px ${ratioColor}66`, transformOrigin: 'left', animation: 'kai-bar-grow 1.2s cubic-bezier(.16,1,.3,1) both' }} />
        </div>
      </div>
    </div>
  )
}


/* ─── Desktop dashboard (full data layout) ─── */
function DesktopNow({ transactions, allTransactions, month, streak }: { transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number }) {
  const monthlyData = buildMonthlyData(allTransactions)
  const prev = monthlyData[monthlyData.length - 2]

  const expense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const income  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const saveRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const now2 = new Date()
  const dayElapsed = now2.getDate()
  const daysTotal  = new Date(now2.getFullYear(), now2.getMonth() + 1, 0).getDate()
  const pacePct    = Math.round((dayElapsed / daysTotal) * 100)
  const expDeltaPct  = prev.exp > 0 ? Math.round(((expense - prev.exp) / prev.exp) * 100) : 0
  const incDeltaPct  = prev.inc > 0 ? Math.round(((income - prev.inc) / prev.inc) * 100) : 0
  const saveSeries   = monthlyData.map((d) => (d.inc > 0 ? Math.round(((d.inc - d.exp) / d.inc) * 100) : 0))

  return (
    <div className="hidden lg:flex lg:flex-col" style={{ gap: 12 }}>
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <DesktopKpiCard label="今月の支出" value={yen(expense)} deltaGood={expDeltaPct <= 0} delta={`${Math.abs(expDeltaPct)}%`} color={DOWN} series={monthlyData.map((d) => d.exp)} delay={0}/>
          <DesktopKpiCard label="今月の収入" value={yen(income)} deltaGood={incDeltaPct >= 0} delta={`${Math.abs(incDeltaPct)}%`} color={UP} series={monthlyData.map((d) => d.inc)} delay={0.04}/>
          <DesktopKpiCard label="貯蓄率" value={String(saveRate)} unit="%" deltaGood={saveRate >= 0} delta={`${saveRate}%`} color={BLUE} series={saveSeries} delay={0.08}/>
          <DesktopKpiCard label="日付ペース" value={String(pacePct)} unit="%" deltaGood={true} delta={`day ${dayElapsed}/${daysTotal}`} color={VIOLET} series={monthlyData.map((_, i) => Math.round(((i + 1) / monthlyData.length) * 100))} delay={0.12}/>
        </div>

        {/* Trend chart + category breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div style={{ ...panel, borderRadius: 18, padding: '18px 18px 10px', animation: 'kai-rise .5s .04s ease-out both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>収支トレンド</div>
                <div style={{ fontSize: 10, color: TEXT3, marginTop: 2 }}>過去 6 ヶ月 / 月次集計</div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10, color: TEXT3 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 2, background: UP, borderRadius: 1 }}/> 収入</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ display: 'inline-block', width: 10, height: 2, background: DOWN, borderRadius: 1 }}/> 支出</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthlyData} margin={{ left: -10, right: 4 }}>
                <defs>
                  <linearGradient id="dI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={UP} stopOpacity={0.3}/><stop offset="100%" stopColor={UP} stopOpacity={0}/></linearGradient>
                  <linearGradient id="dE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={DOWN} stopOpacity={0.3}/><stop offset="100%" stopColor={DOWN} stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 9, fill: TEXT3 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} width={28}/>
                <Tooltip content={<TooltipDark/>}/>
                <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#dI)" dot={false}/>
                <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#dE)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <DesktopCategoryCard transactions={transactions}/>
        </div>

        {/* Recent tx + AI summary + streak */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 12 }}>
          <DesktopRecentTx transactions={transactions}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GoalSection transactions={transactions} />
            <AiSummaryCard/>
            <StreakCard streak={streak}/>
          </div>
        </div>
      </div>
  )
}

/* ─── Goal section (shared between mobile/desktop) ─── */
function GoalSection({ transactions }: { transactions: Transaction[] }) {
  const { data, isLoading, error } = useQuery<{ goals: FinancialGoal[] }>({
    queryKey: ['goals'],
    queryFn: async () => {
      const r = await fetch('/api/goals')
      if (!r.ok) throw new Error('目標の読み込みに失敗しました')
      return r.json()
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  if (isLoading) {
    return <Skeleton variant="panel" className="h-20" />
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.22)',
        borderRadius: 14, padding: '12px 14px',
        color: KAI.danger, fontSize: 12,
      }}>
        目標の読み込みに失敗しました
      </div>
    )
  }

  const goals = data?.goals ?? []
  const currentMonthExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0)
  const currentMonthIncome = transactions
    .filter((t) => t.amount >= 0)
    .reduce((s, t) => s + t.amount, 0)

  if (goals.length === 0) {
    return <GoalBanner />
  }

  // 複数目標の集計（全アクティブ目標の月次貯蓄合計）
  const aggregate = goals.length > 1
    ? {
        totalCount: goals.length,
        totalMonthlySavings: goals.reduce((s, g) => s + (g.monthly_savings_target ?? 0), 0),
        totalSpendingLimit: goals.every((g) => g.monthly_spending_limit !== null)
          ? Math.max(0, currentMonthIncome - goals.reduce((s, g) => s + (g.monthly_savings_target ?? 0), 0))
          : null,
      }
    : undefined

  return (
    <GoalProgressCard
      goal={goals[0]}
      currentMonthExpense={currentMonthExpense}
      currentMonthIncome={currentMonthIncome}
      aggregate={aggregate}
    />
  )
}

/* ─── NOW tab ─── */
function NowTab({ transactions, allTransactions, month, streak }: { transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number }) {
  return (
    <>
      {/* Mobile: mock DashboardScreen order */}
      <div className="lg:hidden space-y-3">
        <CategoryRingHero transactions={transactions} />
        <GoalSection transactions={transactions} />
        <CategoryChips transactions={transactions} />
        <DashKpiRow transactions={transactions} />
      </div>

      {/* Desktop: data dashboard layout */}
      <DesktopNow transactions={transactions} allTransactions={allTransactions} month={month} streak={streak}/>
    </>
  )
}

/* ─── Analytics tab ─── */
function AnalyticsTab({ allTransactions, month }: { allTransactions: Transaction[]; month: string }) {
  const monthlyData  = buildMonthlyData(allTransactions)
  const categoryData = buildCategoryData(allTransactions.filter((t) => t.occurred_on.startsWith(month)))
  const momData      = buildMoMData(allTransactions, month)
  const rankData     = [...categoryData].slice(0, 6).map(([name, { amount, color }]) => ({ name, amount, color }))

  return (
    <div className="space-y-3">
      {/* area chart */}
      <div className="kai-rise rounded-[18px] p-[18px]" style={panel}>
        <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 14 }}>収支トレンド · 6M</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyData} margin={{ left: -10, right: 4 }}>
            <defs>
              <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UP} stopOpacity={0.35} />
                <stop offset="100%" stopColor={UP} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOWN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={DOWN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: 'var(--font-mono),monospace' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: 'var(--font-mono),monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} width={32} />
            <Tooltip content={<TooltipDark />} />
            <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#gI)" dot={false} />
            <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#gE)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="kai-rise grid grid-cols-1 gap-2.5 sm:grid-cols-2" style={{ animationDelay: '80ms' }}>
        {/* category ranking — リスト形式（モバイルで名前が見切れないよう） */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>支出ランキング</p>
          {rankData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (() => {
            const rankTotal = rankData.reduce((s, r) => s + r.amount, 0)
            return rankData.map(({ name, amount, color }, i) => {
              const pct = rankTotal > 0 ? (amount / rankTotal) * 100 : 0
              return (
                <div key={name} style={{ marginBottom: i < rankData.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 9.5, fontWeight: 700, color: i === 0 ? color : TEXT3, minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12, color: TEXT2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace', fontSize: 11, color: TEXT, fontWeight: 600, flexShrink: 0 }}>¥{amount.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden', marginLeft: 20 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, opacity: i === 0 ? 1 : 0.7 }}/>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* MoM */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>先月比</p>
          {momData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (
            <div>
              {momData.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < momData.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <span style={{ fontSize: 12, color: TEXT2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 12, fontWeight: 600, color: row.diff > 0 ? DOWN : UP }}>
                      {row.diff > 0 ? '+' : ''}{fmtK(row.diff)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 11, padding: '2px 6px', borderRadius: 99, background: row.diff > 0 ? 'rgba(251,113,133,.12)' : 'rgba(74,222,128,.12)', color: row.diff > 0 ? DOWN : UP, border: `1px solid ${row.diff > 0 ? 'rgba(251,113,133,.25)' : 'rgba(74,222,128,.25)'}`, fontWeight: 600 }}>
                      {row.diff > 0
                        ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 1L7 7H1L4 1Z" fill="currentColor"/></svg>
                        : <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 7L1 1H7L4 7Z" fill="currentColor"/></svg>
                      }{Math.abs(row.pct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Strategy tab ─── */
function StrategyTab() {
  return (
    <div className="space-y-3">
      <AiSummaryCard />
      <div className="kai-rise" style={{ animationDelay: '140ms' }}>
        <AiChatPanel />
      </div>
    </div>
  )
}

/* ─── main component ─── */
interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  displayName?: string
  streak?: number
}

const TABS = ['NOW', '分析', 'AI戦略'] as const

export function DashboardTabs({ transactions, allTransactions, month, streak: streakProp = 0 }: Props) {
  const [tab, setTab] = useState(0)

  return (
    <div className="px-[18px] py-4 lg:px-[30px]">
      {/* tab bar */}
      <div
        className="mb-4 inline-flex gap-1 rounded-[12px] p-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            aria-pressed={tab === i}
            style={{
              fontFamily: 'var(--font-mono),monospace',
              background: tab === i ? 'rgba(251,148,119,0.12)' : 'transparent',
              color: tab === i ? CORAL : TEXT3,
              boxShadow: tab === i ? `0 0 8px ${CORALG}` : 'none',
              border: 'none', borderRadius: 9, padding: '8px 18px',
              fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
              cursor: 'pointer', minHeight: 38, transition: 'all .18s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <NowTab transactions={transactions} allTransactions={allTransactions} month={month} streak={streakProp} />}
      {tab === 1 && <AnalyticsTab allTransactions={allTransactions} month={month} />}
      {tab === 2 && <StrategyTab />}
    </div>
  )
}
