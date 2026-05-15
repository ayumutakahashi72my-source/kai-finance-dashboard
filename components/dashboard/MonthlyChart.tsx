'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Transaction } from '@/lib/types'

function buildMonthlyData(transactions: Transaction[]) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthTx = transactions.filter((t) => t.occurred_on.startsWith(key))
    return {
      m: `${d.getMonth() + 1}月`,
      inc: monthTx.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
      exp: monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    }
  })
}

const TooltipDark = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-[10px] px-3.5 py-2.5 text-xs"
      style={{
        background: 'rgba(20,22,32,0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.16)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <p className="mono mb-1.5 font-bold text-[#f0f0f5]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="mono mb-0.5" style={{ color: p.color }}>
          {p.name}: ¥{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function MonthlyChart({ transactions }: { transactions: Transaction[] }) {
  const data = buildMonthlyData(transactions)

  return (
    <div
      className="rounded-[18px] p-[18px]"
      style={{
        background: 'rgba(20,22,32,0.66)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <p className="lbl mb-3.5">収支トレンド · 6M</p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ left: -10, right: 4 }}>
          <defs>
            <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="m"
            tick={{ fontSize: 10, fill: '#8b8ba0', fontFamily: 'var(--font-jetbrains),monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#8b8ba0', fontFamily: 'var(--font-jetbrains),monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
            width={32}
          />
          <Tooltip content={<TooltipDark />} />
          <Area type="monotone" dataKey="inc" name="収入" stroke="#4ade80" strokeWidth={2} fill="url(#gI)" dot={false} />
          <Area type="monotone" dataKey="exp" name="支出" stroke="#fb7185" strokeWidth={2} fill="url(#gE)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
