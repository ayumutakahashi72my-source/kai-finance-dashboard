'use client'

import type { Transaction } from '@/lib/types'
import { CORAL, DOWN, AMBER, TEXT3, panel } from './dashboard-utils'

export function DashKpiRow({ transactions }: { transactions: Transaction[] }) {
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
