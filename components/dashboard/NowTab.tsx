'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { GoalBanner } from '@/components/dashboard/GoalBanner'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import type { FinancialGoal } from '@/components/dashboard/GoalProgressCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Icon } from '@/components/kai/shared'
import { useCountUp } from '@/components/kai/hooks'
import { KAI, yen } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'
import {
  pickColor, CORAL, BLUE, VIOLET, UP, DOWN, AMBER,
  TEXT, TEXT2, TEXT3, MONO_FONT, panel,
  buildMonthlyData, buildCategoryData, TooltipDark,
} from './dashboard-utils'

/* ─── Donut arc helpers ─── */
const VB = 200
const CX = VB / 2
const CY = VB / 2
const OUTER_R = 88
const INNER_R  = 62

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const sweep = endDeg - startDeg
  if (sweep >= 359.9) {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: TEXT3, fontWeight: 700, letterSpacing: '.08em' }}>カテゴリ別支出</p>
        <p style={{ fontSize: 9, color: KAI.text4, fontFamily: MONO_FONT }}>残り {daysLeft}日</p>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ flexShrink: 0 }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: 148, height: 148, display: 'block' }} aria-hidden="true">
            <circle cx={CX} cy={CY} r={(OUTER_R + INNER_R) / 2} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={OUTER_R - INNER_R} />
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
      <div style={{ fontFamily: MONO_FONT, fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: '-.02em' }}>
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
        <div style={{ fontSize: 10, color: TEXT3, fontFamily: MONO_FONT }}>{transactions.length} 件</div>
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
            <div style={{ fontSize: 10, color: TEXT3, marginTop: 1, fontFamily: MONO_FONT }}>
              {t.occurred_on.slice(5)} · {t.categories?.name ?? 'その他'}
            </div>
          </div>
          <div style={{ fontFamily: MONO_FONT, fontSize: 12.5, fontWeight: 700, color: t.amount < 0 ? DOWN : UP, flexShrink: 0 }}>
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
              <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: TEXT, fontWeight: 600 }}>
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

/* ─── Category chip ─── */
function CategoryChipItem({ name, value, total, color, icon, idx }: {
  name: string; value: number; total: number; color: string; icon: string | null; idx: number
}) {
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
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: MONO_FONT, color: TEXT, letterSpacing: '-.01em' }}>
        ¥{value.toLocaleString('ja-JP')}
      </div>
      <div style={{ marginTop: 6, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, animatedPct)}%`, background: color, borderRadius: 99 }}/>
      </div>
      <div style={{ fontSize: 9, color: KAI.text4, marginTop: 3, fontFamily: MONO_FONT }}>
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

/* ─── KPI row (mobile) ─── */
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

/* ─── Goal section ─── */
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

  if (isLoading) return <Skeleton variant="panel" className="h-20" />

  if (error) {
    return (
      <div style={{ background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.22)', borderRadius: 14, padding: '12px 14px', color: KAI.danger, fontSize: 12 }}>
        目標の読み込みに失敗しました
      </div>
    )
  }

  const goals = data?.goals ?? []
  const currentMonthExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const currentMonthIncome  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)

  if (goals.length === 0) return <GoalBanner />

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

/* ─── Desktop layout ─── */
function DesktopNow({ transactions, allTransactions, streak }: {
  transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number
}) {
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <DesktopKpiCard label="今月の支出" value={yen(expense)} deltaGood={expDeltaPct <= 0} delta={`${Math.abs(expDeltaPct)}%`} color={DOWN} series={monthlyData.map((d) => d.exp)} delay={0}/>
        <DesktopKpiCard label="今月の収入" value={yen(income)} deltaGood={incDeltaPct >= 0} delta={`${Math.abs(incDeltaPct)}%`} color={UP} series={monthlyData.map((d) => d.inc)} delay={0.04}/>
        <DesktopKpiCard label="貯蓄率" value={String(saveRate)} unit="%" deltaGood={saveRate >= 0} delta={`${saveRate}%`} color={BLUE} series={saveSeries} delay={0.08}/>
        <DesktopKpiCard label="日付ペース" value={String(pacePct)} unit="%" deltaGood={true} delta={`day ${dayElapsed}/${daysTotal}`} color={VIOLET} series={monthlyData.map((_, i) => Math.round(((i + 1) / monthlyData.length) * 100))} delay={0.12}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <DesktopTrendChart monthlyData={monthlyData} />
        <DesktopCategoryCard transactions={transactions}/>
      </div>

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

/* ─── Desktop trend chart ─── */
function DesktopTrendChart({ monthlyData }: { monthlyData: { m: string; inc: number; exp: number }[] }) {
  return (
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
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize: 9, fill: TEXT3 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} width={28}/>
          <Tooltip content={<TooltipDark/>}/>
          <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#dI)" dot={false}/>
          <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#dE)" dot={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── exported component ─── */
export function NowTab({ transactions, allTransactions, month, streak }: {
  transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number
}) {
  return (
    <>
      <div className="lg:hidden space-y-3">
        <CategoryRingHero transactions={transactions} />
        <GoalSection transactions={transactions} />
        <CategoryChips transactions={transactions} />
        <DashKpiRow transactions={transactions} />
      </div>
      <DesktopNow transactions={transactions} allTransactions={allTransactions} month={month} streak={streak}/>
    </>
  )
}
