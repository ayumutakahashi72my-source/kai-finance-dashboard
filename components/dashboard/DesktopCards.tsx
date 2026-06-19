'use client'

import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { Icon } from '@/components/kai/shared'
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used conditionally
import { yen } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'
import {
  pickColor, UP, DOWN,
  TEXT, TEXT2, TEXT3, MONO_FONT, panel,
} from './dashboard-utils'
import type { CategoryData } from './dashboard-utils'

export function DesktopKpiCard({
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

export function DesktopRecentTx({ transactions }: { transactions: Transaction[] }) {
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

export function DesktopCategoryCard({ categoryData }: { categoryData: CategoryData }) {
  const total = categoryData.reduce((s, [, { amount }]) => s + amount, 0)
  const top6 = categoryData.slice(0, 6)
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
