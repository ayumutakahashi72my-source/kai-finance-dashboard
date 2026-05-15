'use client'

import { useState } from 'react'
import type { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
}

export function Ticker({ transactions }: Props) {
  const [paused, setPaused] = useState(false)

  const totalIncome = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const balance = totalIncome - totalExpense

  const items = [
    { l: 'INCOME',  v: `¥${totalIncome.toLocaleString()}`,   c: '#4ade80' },
    { l: 'EXPENSE', v: `¥${totalExpense.toLocaleString()}`,  c: '#fb7185' },
    { l: 'BALANCE', v: `${balance >= 0 ? '+' : ''}¥${balance.toLocaleString()}`, c: '#5eead4' },
  ]
  const rep = [...items, ...items, ...items, ...items]

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.10)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        className="ticker-track inline-block"
        style={{ animationPlayState: paused ? 'paused' : 'running' }}
      >
        {rep.map((t, i) => (
          <span
            key={i}
            className="mono inline-block px-6 py-2.5 text-xs tracking-[0.04em] text-[#c4c4d0]"
          >
            <span className="text-[#8b8ba0] mr-1.5">{t.l}</span>
            <span className="font-semibold" style={{ color: t.c }}>{t.v}</span>
            <span className="text-[#8b8ba0] mx-3">·</span>
          </span>
        ))}
      </div>
      <button
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'ティッカーを再生' : 'ティッカーを一時停止'}
        aria-pressed={paused}
        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[13px] text-[#c4c4d0]"
        style={{
          background: 'rgba(20,22,32,0.92)',
          border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {paused ? '▶' : '⏸'}
      </button>
    </div>
  )
}
