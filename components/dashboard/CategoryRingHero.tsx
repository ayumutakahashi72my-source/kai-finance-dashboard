'use client'

import { useState } from 'react'
import { useCountUp } from '@/components/kai/hooks'
import { KAI, yen } from '@/lib/kai-tokens'
import { jstNow } from '@/lib/jst'
import { CORAL, TEXT, TEXT2, TEXT3, MONO_FONT, panel } from './dashboard-utils'
import type { CategoryData } from './dashboard-utils'

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

export function CategoryRingHero({ categoryData }: { categoryData: CategoryData }) {
  const [hovered,  setHovered]  = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const active = hovered ?? selected

  const totalExpense  = categoryData.reduce((s, [, { amount }]) => s + amount, 0)
  const totalAnimated = useCountUp(totalExpense, { duration: 1400 })

  const now2     = jstNow()
  const daysLeft = new Date(Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth() + 1, 0)).getUTCDate() - now2.getUTCDate()

  const top5 = categoryData.slice(0, 5)
  const restAmount = categoryData.slice(5).reduce((s, [, { amount }]) => s + amount, 0)
  const segments: [string, { amount: number; color: string }][] = [
    ...top5,
    ...(restAmount > 0 ? [['その他', { amount: restAmount, color: '#5e5e72' }] as [string, { amount: number; color: string }]] : []),
  ]

  const GAP_DEG = segments.length > 1 ? 2.5 : 0
  const totalAvailable = 360 - GAP_DEG * segments.length
  let cumDeg = 0
  const arcs = segments.map(([name, { amount, color }]) => {
    const frac     = totalExpense > 0 ? amount / totalExpense : 0
    const spanDeg  = frac * totalAvailable
    const startDeg = cumDeg + GAP_DEG / 2
    const endDeg   = cumDeg + GAP_DEG / 2 + spanDeg
    cumDeg += spanDeg + GAP_DEG
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
            <circle cx={CX} cy={CY} r={(OUTER_R + INNER_R) / 2} fill="none" stroke={KAI.border} strokeWidth={OUTER_R - INNER_R} />
            {totalExpense === 0 ? (
              <circle cx={CX} cy={CY} r={(OUTER_R + INNER_R) / 2} fill="none" stroke={KAI.border2} strokeWidth={OUTER_R - INNER_R} />
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
