'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

function Stat({
  label,
  value,
  color,
  prefix = '¥',
}: {
  label: string
  value: string
  color: string
  prefix?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 16, fontWeight: 800, color, ...MONO, letterSpacing: '-.02em' }}>
        {prefix}{value}
      </span>
    </div>
  )
}

export function CashflowCard({ month }: { month: string }) {
  const { data, isLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month],
    queryFn: () => fetch(`/api/transactions?month=${month}`).then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })

  if (isLoading) {
    return (
      <div style={{ animation: 'kai-rise .5s .05s ease-out both' }}>
        <Skeleton variant="panel" className="h-20" />
      </div>
    )
  }

  const transactions = data?.data ?? []
  const income  = transactions.filter((tx) => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0)
  const expense = transactions.filter((tx) => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0)
  const savings = income - expense
  const rate    = income > 0 ? Math.round((savings / income) * 100) : null

  if (income === 0 && expense === 0) return null

  return (
    <section
      style={{
        background: KAI.overlayWeak,
        border: `1px solid ${KAI.border}`,
        borderRadius: 18,
        padding: '14px 18px',
        animation: 'kai-rise .5s .05s ease-out both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase' }}>
          キャッシュフロー
        </span>
        {rate !== null && (
          <span style={{
            fontSize: 11, fontWeight: 700, ...MONO,
            color: rate >= 0 ? KAI.success : KAI.danger,
            background: rate >= 0 ? `${KAI.success}12` : `${KAI.danger}12`,
            border: `1px solid ${rate >= 0 ? KAI.success : KAI.danger}33`,
            borderRadius: 8, padding: '3px 9px',
          }}>
            貯蓄率 {rate}%
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Stat label="収入" value={income.toLocaleString('ja-JP')}  color={KAI.success} />
        <Stat label="支出" value={expense.toLocaleString('ja-JP')} color={KAI.danger} />
        <Stat
          label="貯蓄"
          value={Math.abs(savings).toLocaleString('ja-JP')}
          color={savings >= 0 ? KAI.success : KAI.danger}
          prefix={savings >= 0 ? '¥' : '−¥'}
        />
      </div>
    </section>
  )
}
