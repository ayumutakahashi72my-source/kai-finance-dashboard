'use client'

import { useState, useMemo } from 'react'
import type { Transaction, Category } from '@/lib/types'

interface DayData {
  date: string // YYYY-MM-DD
  income: number
  expense: number
  transactions: Transaction[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string // YYYY-MM
}

export function CalendarView({ transactions, categories, month }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  )

  const [year, mon] = month.split('-').map(Number)
  const firstDay = new Date(year, mon - 1, 1).getDay() // 0=Sun
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

  const selected = selectedDate ? dayMap[selectedDate] : null

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)])

  const today = new Date().toISOString().slice(0, 10)

  function fmt(n: number) {
    return n >= 10000
      ? `${(n / 10000).toFixed(1)}万`
      : `${n.toLocaleString()}`
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Calendar grid */}
      <div className="flex-1">
        {/* Day labels */}
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
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const dow = (firstDay + day - 1) % 7

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="relative flex min-h-[60px] flex-col items-start rounded-[10px] p-1.5 text-left transition-all"
                style={{
                  background: isSelected
                    ? 'rgba(94,234,212,0.12)'
                    : 'rgba(255,255,255,0.03)',
                  border: isSelected
                    ? '1px solid rgba(94,234,212,0.4)'
                    : isToday
                    ? '1px solid rgba(94,234,212,0.2)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
              >
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
                      <div className="truncate text-[10px] font-semibold leading-tight" style={{ color: '#f87171' }}>
                        -{fmt(data.expense)}
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div
        className="w-full lg:w-[280px]"
        style={{
          borderRadius: 16,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 16,
          minHeight: 200,
        }}
      >
        {selected ? (
          <>
            <p className="mb-3 text-sm font-bold" style={{ color: '#5eead4' }}>
              {selected.date.replace(/-/g, '/')}
            </p>

            {selected.income > 0 && (
              <div className="mb-1 flex justify-between text-xs">
                <span style={{ color: '#8b8ba0' }}>収入</span>
                <span className="font-semibold" style={{ color: '#4ade80' }}>
                  +¥{selected.income.toLocaleString()}
                </span>
              </div>
            )}
            {selected.expense > 0 && (
              <div className="mb-3 flex justify-between text-xs">
                <span style={{ color: '#8b8ba0' }}>支出</span>
                <span className="font-semibold" style={{ color: '#f87171' }}>
                  -¥{selected.expense.toLocaleString()}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {selected.transactions.map((tx) => {
                const cat = tx.category_id ? categoryMap[tx.category_id] : null
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 rounded-[8px] px-2 py-2"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {cat?.color && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: cat.color }}
                        />
                      )}
                      <span className="truncate text-xs" style={{ color: '#c4c4d0' }}>
                        {tx.payee}
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-xs font-semibold"
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
          <p className="text-center text-xs" style={{ color: '#8b8ba0', marginTop: 40 }}>
            日付をタップすると<br />取引が表示されます
          </p>
        )}
      </div>
    </div>
  )
}
