'use client'

import { useState, useMemo } from 'react'
import type { Transaction, Category } from '@/lib/types'

interface DayData {
  date: string
  income: number
  expense: number
  transactions: Transaction[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string // YYYY-MM
}

function heatColor(ratio: number): string {
  // 0 → transparent, 1 → deep orange-red
  if (ratio <= 0) return 'transparent'
  const opacity = 0.12 + ratio * 0.55
  const r = Math.round(248 + (239 - 248) * ratio)
  const g = Math.round(113 + (68 - 113) * ratio)
  const b = Math.round(113 + (68 - 113) * ratio)
  return `rgba(${r},${g},${b},${opacity})`
}

function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n.toLocaleString()
}

export function CalendarView({ transactions, categories, month }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1).getDay()
  const daysInMonth = new Date(year, mon, 0).getDate()

  const dayMap = useMemo(() => {
    const map: Record<string, DayData> = {}
    for (const tx of transactions) {
      const d = tx.occurred_on.slice(0, 10)
      if (!map[d]) map[d] = { date: d, income: 0, expense: 0, transactions: [] }
      if (tx.amount > 0) map[d].income += tx.amount
      else map[d].expense += Math.abs(tx.amount)
      map[d].transactions.push(tx)
    }
    return map
  }, [transactions])

  const maxExpense = useMemo(
    () => Math.max(1, ...Object.values(dayMap).map((d) => d.expense)),
    [dayMap]
  )

  const selected = selectedDate ? (dayMap[selectedDate] ?? { date: selectedDate, income: 0, expense: 0, transactions: [] }) : null

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)])

  const today = new Date().toISOString().slice(0, 10)

  // Category breakdown for selected day
  const catBreakdown = useMemo(() => {
    if (!selected) return []
    const map: Record<string, { name: string; color: string | null; total: number }> = {}
    for (const tx of selected.transactions) {
      if (tx.amount >= 0) continue
      const cat = tx.category_id ? categoryMap[tx.category_id] : null
      const key = cat?.name ?? '未分類'
      if (!map[key]) map[key] = { name: key, color: cat?.color ?? null, total: 0 }
      map[key].total += Math.abs(tx.amount)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [selected, categoryMap])

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Calendar grid */}
      <div className="flex-1">
        {/* Heatmap legend */}
        <div className="mb-2 flex items-center justify-end gap-1.5">
          <span className="text-[11px]" style={{ color: '#8b8ba0' }}>支出少</span>
          {[0.05, 0.25, 0.5, 0.75, 1].map((r) => (
            <span
              key={r}
              className="inline-block h-3 w-3 rounded-[3px]"
              style={{ background: heatColor(r), border: '1px solid rgba(255,255,255,0.08)' }}
            />
          ))}
          <span className="text-[11px]" style={{ color: '#8b8ba0' }}>多</span>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div
              key={d}
              className="py-1 text-xs font-semibold"
              style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : '#8b8ba0' }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[3px]">
          {weeks.flat().map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />

            const dateStr = `${month}-${String(day).padStart(2, '0')}`
            const data = dayMap[dateStr]
            const ratio = data ? data.expense / maxExpense : 0
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const dow = (firstDay + day - 1) % 7

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="relative flex min-h-[64px] flex-col items-start rounded-[10px] p-1.5 text-left transition-all"
                style={{
                  background: isSelected
                    ? 'rgba(94,234,212,0.12)'
                    : heatColor(ratio),
                  border: isSelected
                    ? '1px solid rgba(94,234,212,0.5)'
                    : isToday
                    ? '1px solid rgba(94,234,212,0.25)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {/* Date number */}
                <span
                  className="mb-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: isToday ? '#5eead4' : 'transparent',
                    color: isToday
                      ? '#0a0a10'
                      : dow === 0
                      ? '#f87171'
                      : dow === 6
                      ? '#60a5fa'
                      : '#c4c4d0',
                  }}
                >
                  {day}
                </span>

                {data && (
                  <div className="w-full space-y-[2px]">
                    {data.income > 0 && (
                      <div className="truncate text-[10px] font-semibold leading-tight" style={{ color: '#4ade80' }}>
                        +{fmt(data.income)}
                      </div>
                    )}
                    {data.expense > 0 && (
                      <div className="truncate text-[10px] font-semibold leading-tight" style={{ color: '#fca5a5' }}>
                        -{fmt(data.expense)}
                      </div>
                    )}
                  </div>
                )}

                {/* Dot indicator for fixed expenses */}
                {data?.transactions.some((t) => t.is_fixed) && (
                  <span
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                    style={{ background: '#a78bfa' }}
                    title="固定費あり"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Heatmap bar — monthly spend intensity */}
        <div className="mt-4">
          <p className="mb-1.5 text-[11px]" style={{ color: '#8b8ba0' }}>日別支出ヒートマップ</p>
          <div className="flex gap-[2px]">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
              const data = dayMap[dateStr]
              const ratio = data ? data.expense / maxExpense : 0
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                  className="flex-1 rounded-[3px] transition-opacity hover:opacity-80"
                  style={{
                    height: 20,
                    background: ratio > 0 ? heatColor(ratio) : 'rgba(255,255,255,0.05)',
                    border: selectedDate === dateStr ? '1px solid rgba(94,234,212,0.6)' : '1px solid transparent',
                  }}
                  title={`${i + 1}日 ¥${(data?.expense ?? 0).toLocaleString()}`}
                />
              )
            })}
          </div>
          <div className="mt-0.5 flex justify-between text-[10px]" style={{ color: '#8b8ba0' }}>
            <span>1日</span>
            <span>{daysInMonth}日</span>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      <div
        className="w-full lg:w-[300px] lg:shrink-0"
        style={{
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 16,
          minHeight: 220,
        }}
      >
        {selected ? (
          <>
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold" style={{ color: '#5eead4' }}>
                {selected.date.replace(/-/g, '/')}
              </p>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-xs"
                style={{ color: '#8b8ba0' }}
              >
                ✕
              </button>
            </div>

            {/* Day totals */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div
                className="rounded-[10px] p-2.5"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}
              >
                <p className="text-[10px]" style={{ color: '#8b8ba0' }}>収入</p>
                <p className="text-sm font-bold" style={{ color: '#4ade80' }}>
                  {selected.income > 0 ? `+¥${selected.income.toLocaleString()}` : '—'}
                </p>
              </div>
              <div
                className="rounded-[10px] p-2.5"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
              >
                <p className="text-[10px]" style={{ color: '#8b8ba0' }}>支出</p>
                <p className="text-sm font-bold" style={{ color: '#f87171' }}>
                  {selected.expense > 0 ? `-¥${selected.expense.toLocaleString()}` : '—'}
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            {catBreakdown.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-[11px] font-semibold" style={{ color: '#8b8ba0' }}>カテゴリ内訳</p>
                <div className="space-y-1.5">
                  {catBreakdown.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: cat.color ?? '#8b8ba0' }}
                      />
                      <span className="min-w-0 flex-1 truncate text-xs" style={{ color: '#c4c4d0' }}>
                        {cat.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold" style={{ color: '#f87171' }}>
                        ¥{cat.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction list */}
            {selected.transactions.length > 0 ? (
              <>
                <p className="mb-1.5 text-[11px] font-semibold" style={{ color: '#8b8ba0' }}>取引詳細</p>
                <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 240 }}>
                  {selected.transactions.map((tx) => {
                    const cat = tx.category_id ? categoryMap[tx.category_id] : null
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-2 rounded-[8px] px-2.5 py-2"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-xs font-medium" style={{ color: '#f0f0f5' }}>
                            {tx.payee}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {cat && (
                              <>
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: cat.color ?? '#8b8ba0' }}
                                />
                                <span className="text-[10px]" style={{ color: '#8b8ba0' }}>{cat.name}</span>
                              </>
                            )}
                            {tx.is_fixed && (
                              <span
                                className="rounded px-1 text-[9px] font-semibold"
                                style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}
                              >
                                固定
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-sm font-bold"
                          style={{ color: tx.amount > 0 ? '#4ade80' : '#f87171' }}
                        >
                          {tx.amount > 0 ? '+' : ''}¥{tx.amount.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-center text-xs" style={{ color: '#8b8ba0', marginTop: 16 }}>
                この日の取引はありません
              </p>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2" style={{ minHeight: 180 }}>
            <div className="text-3xl opacity-30">📅</div>
            <p className="text-center text-xs leading-relaxed" style={{ color: '#8b8ba0' }}>
              日付またはヒートマップを<br />タップすると詳細が表示されます
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
