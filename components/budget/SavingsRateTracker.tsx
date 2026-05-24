'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

interface MonthData {
  month:        string
  income:       number
  expense:      number
  savings:      number
  savings_rate: number | null
}

/* ─── Mini bar chart (SVG, no library) ─────────────────────────── */

function RateBar({ data }: { data: MonthData[] }) {
  const CHART_H = 52
  const BAR_W   = 14
  const GAP     = 5
  const total   = data.length
  const width   = total * (BAR_W + GAP) - GAP

  const rates    = data.map((d) => d.savings_rate ?? 0)
  const maxAbs   = Math.max(Math.abs(Math.min(...rates)), Math.max(...rates), 1)
  const baseline = CHART_H / 2

  function barProps(rate: number) {
    const pct  = Math.min(1, Math.abs(rate) / maxAbs)
    const h    = Math.max(2, pct * (CHART_H / 2 - 4))
    const isPos = rate >= 0
    const y    = isPos ? baseline - h : baseline
    return { h, y, isPos }
  }

  return (
    <svg width={width} height={CHART_H} style={{ overflow: 'visible', display: 'block' }}>
      {/* baseline */}
      <line x1={0} y1={baseline} x2={width} y2={baseline} stroke="rgba(255,255,255,.08)" strokeWidth={1}/>
      {data.map((d, i) => {
        const rate = d.savings_rate ?? 0
        const { h, y, isPos } = barProps(rate)
        const x = i * (BAR_W + GAP)
        const color = isPos ? KAI.success : KAI.danger
        return (
          <g key={d.month}>
            <rect
              x={x} y={y} width={BAR_W} height={h}
              rx={3}
              fill={color}
              opacity={0.75}
            />
          </g>
        )
      })}
    </svg>
  )
}

/* ─── Main component ────────────────────────────────────────────── */

export function SavingsRateTracker({ currentMonth }: { currentMonth: string }) {
  const { data, isLoading } = useQuery<{ data: MonthData[] }>({
    queryKey: ['cashflow', currentMonth],
    queryFn: () => fetch('/api/cashflow?months=6').then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div style={{ animation: 'kai-rise .5s .35s ease-out both' }}>
        <Skeleton variant="panel" className="h-28" />
      </div>
    )
  }

  const months = data?.data ?? []
  if (months.length < 2) return null

  const rates        = months.map((m) => m.savings_rate).filter((r): r is number => r !== null)
  const avg3         = rates.slice(-3).length > 0
    ? Math.round(rates.slice(-3).reduce((a, b) => a + b, 0) / rates.slice(-3).length)
    : null
  const bestMonth    = months.reduce((a, b) => ((a.savings_rate ?? -Infinity) > (b.savings_rate ?? -Infinity) ? a : b))
  const worstMonth   = months.reduce((a, b) => ((a.savings_rate ?? Infinity) < (b.savings_rate ?? Infinity) ? a : b))
  const latest       = months[months.length - 1]

  function label(m: string) {
    const [, mo] = m.split('-')
    return `${parseInt(mo, 10)}月`
  }

  return (
    <section
      style={{
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 18,
        padding: '14px 18px',
        animation: 'kai-rise .5s .35s ease-out both',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          貯蓄率トレンド
        </span>
        {avg3 !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, ...MONO,
            color: KAI.violet,
            background: `${KAI.violet}12`,
            border: `1px solid ${KAI.violet}30`,
            borderRadius: 8, padding: '3px 9px',
          }}>
            3ヶ月平均 {avg3}%
          </span>
        )}
      </div>

      {/* chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <RateBar data={months} />
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            {months.map((m) => (
              <div key={m.month} style={{ width: 14, textAlign: 'center', fontSize: 9, color: KAI.text4 }}>
                {label(m.month)}
              </div>
            ))}
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: KAI.text4, letterSpacing: '.08em', fontWeight: 700 }}>今月</div>
            <div style={{
              fontSize: 15, fontWeight: 800, ...MONO,
              color: (latest.savings_rate ?? 0) >= 0 ? KAI.success : KAI.danger,
            }}>
              {latest.savings_rate !== null ? `${latest.savings_rate}%` : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: KAI.text4, letterSpacing: '.08em', fontWeight: 700 }}>最高</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: KAI.success, ...MONO }}>
              {bestMonth.savings_rate !== null ? `${bestMonth.savings_rate}%` : '—'}
              <span style={{ fontSize: 9, color: KAI.text4, fontWeight: 400, marginLeft: 3 }}>{label(bestMonth.month)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: KAI.text4, letterSpacing: '.08em', fontWeight: 700 }}>最低</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: KAI.danger, ...MONO }}>
              {worstMonth.savings_rate !== null ? `${worstMonth.savings_rate}%` : '—'}
              <span style={{ fontSize: 9, color: KAI.text4, fontWeight: 400, marginLeft: 3 }}>{label(worstMonth.month)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
