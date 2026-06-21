'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CashflowCard } from '@/components/budget/CashflowCard'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

function DetectButton() {
  const qc = useQueryClient()
  const [result, setResult] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      fetch('/api/fixed-expenses/detect', { method: 'POST' }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '検出に失敗しました')
        return j as { detected: number }
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['fixed_expenses'] })
      setResult(data.detected > 0 ? `${data.detected}件の固定費候補を検出しました` : '新しい固定費候補は見つかりませんでした')
      setTimeout(() => setResult(null), 4000)
    },
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={() => mutate()}
        disabled={isPending}
        style={{
          fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
          background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}38`,
          color: KAI.violet, cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? '検出中...' : '固定費を自動検出'}
      </button>
      {result && (
        <span style={{ fontSize: 11, color: KAI.text3 }}>{result}</span>
      )}
    </div>
  )
}

export function AnalyticsContent({ month, allTransactions }: { month: string; allTransactions: Transaction[] }) {
  return (
    <>
      <CashflowCard month={month} />
      <AnalyticsTab allTransactions={allTransactions} month={month} />

      {/* fixed expense detection */}
      <div style={{ marginTop: 12 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 8, flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{
            fontSize: 10, color: KAI.text4, letterSpacing: '.14em',
            fontWeight: 700, textTransform: 'uppercase',
          }}>
            固定費の自動検出
          </span>
          <DetectButton />
        </div>
        <FixedExpenseCard />
      </div>
    </>
  )
}
