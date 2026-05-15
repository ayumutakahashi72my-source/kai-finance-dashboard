'use client'

import { useEffect, useState } from 'react'
import type { Transaction } from '@/lib/types'

function useCountUp(target: number, dur = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let start: number | null = null
    let raf: number
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / dur, 1)
      setV(Math.round((1 - Math.pow(1 - p, 4)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, dur])
  return v
}

function Spark({ data, w = 220, h = 32 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const rng = max - min || 1
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / rng) * h * 0.9 - h * 0.05,
  ])
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <path d={d} fill="none" stroke="#5eead4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function buildMonthlyExpenses(transactions: Transaction[]): number[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return transactions
      .filter((t) => t.amount < 0 && t.occurred_on.startsWith(key))
      .reduce((s, t) => s + Math.abs(t.amount), 0)
  })
}

interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
}

export function SummaryCards({ transactions, allTransactions }: Props) {
  const totalIncome = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const balance = totalIncome - totalExpense

  const displayBalance = useCountUp(Math.abs(balance))
  const displayExpense = useCountUp(totalExpense)

  const sparkData = buildMonthlyExpenses(allTransactions)

  return (
    <div
      className="reveal-up relative overflow-hidden rounded-[18px] p-[22px]"
      style={{
        background: 'linear-gradient(135deg,rgba(94,234,212,0.10),rgba(20,22,32,0.66))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(94,234,212,0.22)',
      }}
    >
      {/* glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full"
        style={{ background: 'radial-gradient(circle,rgba(94,234,212,0.28),transparent 70%)', filter: 'blur(20px)' }}
      />

      <div className="flex items-start justify-between">
        <p className="lbl">今月の収支</p>
        {balance !== 0 && (
          <span
            className="mono rounded-full px-2.5 py-1 text-xs"
            style={{
              color: balance >= 0 ? '#4ade80' : '#fb7185',
              background: balance >= 0 ? 'rgba(74,222,128,0.10)' : 'rgba(251,113,133,0.10)',
              border: `1px solid ${balance >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(251,113,133,0.25)'}`,
            }}
          >
            {balance >= 0 ? '▲' : '▼'} {balance >= 0 ? '+' : '-'}¥{Math.abs(balance).toLocaleString()}
          </span>
        )}
      </div>

      <p
        className="mono mt-2.5 leading-none tracking-tight"
        style={{
          fontSize: 44,
          fontWeight: 700,
          color: balance >= 0 ? '#5eead4' : '#fb7185',
          textShadow: balance >= 0 ? '0 0 32px rgba(94,234,212,0.28)' : '0 0 32px rgba(251,113,133,0.28)',
          letterSpacing: '-0.02em',
        }}
      >
        {balance >= 0 ? '+' : '-'}¥{displayBalance.toLocaleString()}
      </p>

      <div className="mt-3.5 flex gap-5 text-[13px] text-[#c4c4d0]">
        <span>
          <span className="text-[#8b8ba0]">収入　</span>
          <span className="mono">¥{totalIncome.toLocaleString()}</span>
        </span>
        <span>
          <span className="text-[#8b8ba0]">支出　</span>
          <span className="mono">¥{displayExpense.toLocaleString()}</span>
        </span>
      </div>

      {sparkData.some((v) => v > 0) && (
        <div className="mt-3">
          <Spark data={sparkData} />
        </div>
      )}
    </div>
  )
}
