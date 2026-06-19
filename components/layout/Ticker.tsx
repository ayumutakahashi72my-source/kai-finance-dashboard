'use client'

import { useState } from 'react'
import { KAI } from '@/lib/kai-tokens'
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
    { l: 'INCOME',  v: `¥${totalIncome.toLocaleString()}`,   c: KAI.success },
    { l: 'EXPENSE', v: `¥${totalExpense.toLocaleString()}`,  c: KAI.danger },
    { l: 'BALANCE', v: `${balance >= 0 ? '+' : ''}¥${balance.toLocaleString()}`, c: KAI.coral },
  ]
  const rep = [...items, ...items, ...items, ...items]

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderTop: `1px solid ${KAI.border2}`,
        borderBottom: `1px solid ${KAI.border2}`,
        background: KAI.overlayWeak,
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
            className="mono inline-block px-6 py-2.5 text-xs tracking-[0.04em]"
            style={{ color: KAI.text2 }}
          >
            <span className="mr-1.5" style={{ color: KAI.text3 }}>{t.l}</span>
            <span className="font-semibold" style={{ color: t.c }}>{t.v}</span>
            <span className="mx-3" style={{ color: KAI.text3 }}>·</span>
          </span>
        ))}
      </div>
      <button
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'ティッカーを再生' : 'ティッカーを一時停止'}
        aria-pressed={paused}
        className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[13px]"
        style={{
          color: KAI.text2,
          background: KAI.overlayBg,
          border: `1px solid ${KAI.borderStrong}`,
          backdropFilter: 'blur(20px)',
        }}
      >
        {paused
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 1.5L8.5 5L2 8.5V1.5Z" fill="currentColor"/></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="1.5" width="2.5" height="7" rx="0.8" fill="currentColor"/><rect x="5.5" y="1.5" width="2.5" height="7" rx="0.8" fill="currentColor"/></svg>
        }
      </button>
    </div>
  )
}
