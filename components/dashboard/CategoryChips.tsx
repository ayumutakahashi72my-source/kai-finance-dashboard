'use client'

import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useCountUp } from '@/components/kai/hooks'
import { KAI } from '@/lib/kai-tokens'
import { TEXT, MONO_FONT } from './dashboard-utils'
import type { CategoryData } from './dashboard-utils'

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
        全体の{Math.round(pct)}%
      </div>
    </div>
  )
}

export function CategoryChips({ categoryData }: { categoryData: CategoryData }) {
  const total = categoryData.reduce((s, [, { amount }]) => s + amount, 0)
  const top4  = categoryData.slice(0, 4)
  if (total === 0) return null
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .6s .35s ease-out both' }}>
      {top4.map(([name, { amount, color, icon }], i) => (
        <CategoryChipItem key={name} name={name} value={amount} total={total} color={color} icon={icon} idx={i}/>
      ))}
    </section>
  )
}
