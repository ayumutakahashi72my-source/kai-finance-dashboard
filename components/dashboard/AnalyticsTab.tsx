'use client'

import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { Transaction } from '@/lib/types'
import { KAI } from '@/lib/kai-tokens'
import {
  UP, DOWN, TEXT, TEXT2, TEXT3, BORDER, MONO_FONT, panel,
  fmtK, buildMonthlyData, buildCategoryData, buildMoMData, TooltipDark,
} from './dashboard-utils'

export function AnalyticsTab({ allTransactions, month }: {
  allTransactions: Transaction[]; month: string
}) {
  const monthlyData  = buildMonthlyData(allTransactions)
  const categoryData = buildCategoryData(allTransactions.filter((t) => t.occurred_on.startsWith(month)))
  const momData      = buildMoMData(allTransactions, month)
  const rankData     = [...categoryData].slice(0, 6).map(([name, { amount, color }]) => ({ name, amount, color }))

  return (
    <div className="space-y-3">
      {/* area chart */}
      <div className="kai-rise rounded-[18px] p-[18px]" style={panel}>
        <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 14 }}>収支トレンド · 6M</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthlyData} margin={{ left: -10, right: 4 }}>
            <defs>
              <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={UP} stopOpacity={0.35} />
                <stop offset="100%" stopColor={UP} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOWN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={DOWN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="m" tick={{ fontSize: 10, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: TEXT3, fontFamily: MONO_FONT }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} width={32} />
            <Tooltip content={<TooltipDark />} />
            <Area type="monotone" dataKey="inc" name="収入" stroke={UP}   strokeWidth={2} fill="url(#gI)" dot={false} />
            <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#gE)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="kai-rise grid grid-cols-1 gap-2.5 sm:grid-cols-2" style={{ animationDelay: '80ms' }}>
        {/* category ranking */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>支出ランキング</p>
          {rankData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (() => {
            const rankTotal = rankData.reduce((s, r) => s + r.amount, 0)
            return rankData.map(({ name, amount, color }, i) => {
              const pct = rankTotal > 0 ? (amount / rankTotal) * 100 : 0
              return (
                <div key={name} style={{ marginBottom: i < rankData.length - 1 ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 9.5, fontWeight: 700, color: i === 0 ? color : TEXT3, minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 12, color: TEXT2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontFamily: MONO_FONT, fontSize: 11, color: TEXT, fontWeight: 600, flexShrink: 0 }}>¥{amount.toLocaleString('ja-JP')}</span>
                  </div>
                  <div style={{ height: 3, background: KAI.border, borderRadius: 99, overflow: 'hidden', marginLeft: 20 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, opacity: i === 0 ? 1 : 0.7 }}/>
                  </div>
                </div>
              )
            })
          })()}
        </div>

        {/* MoM */}
        <div className="rounded-[18px] p-4" style={panel}>
          <p style={{ fontSize: 11, color: TEXT3, letterSpacing: '.08em', fontWeight: 700, marginBottom: 12 }}>先月比</p>
          {momData.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: TEXT3 }}>データなし</p>
          ) : (
            <div>
              {momData.map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < momData.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                  <span style={{ fontSize: 12, color: TEXT2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 12, fontWeight: 600, color: row.diff > 0 ? DOWN : UP }}>
                      {row.diff > 0 ? '+' : ''}{fmtK(row.diff)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 11, padding: '2px 6px', borderRadius: 99, background: row.diff > 0 ? 'rgba(251,113,133,.12)' : 'rgba(74,222,128,.12)', color: row.diff > 0 ? DOWN : UP, border: `1px solid ${row.diff > 0 ? 'rgba(251,113,133,.25)' : 'rgba(74,222,128,.25)'}`, fontWeight: 600 }}>
                      {row.diff > 0
                        ? <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 1L7 7H1L4 1Z" fill="currentColor"/></svg>
                        : <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 1 }}><path d="M4 7L1 1H7L4 7Z" fill="currentColor"/></svg>
                      }{Math.abs(row.pct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
