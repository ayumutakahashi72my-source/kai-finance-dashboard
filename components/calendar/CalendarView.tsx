'use client'

import { useState, useMemo, useEffect } from 'react'
import { KAI } from '@/lib/kai-tokens'
import { todayJST } from '@/lib/jst'
import { useSwipeDismiss } from '@/lib/hooks/use-swipe-dismiss'
import type { Transaction, Category } from '@/lib/types'

interface DayData {
  date: string
  income: number
  expense: number
  heatExpense: number // fixed費・クレカ除外後の支出
  transactions: Transaction[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  month: string
}

// ヒートマップから除外すべき取引かどうか判定
// MFのCSVはカタカナ長音を半角ハイフン「-」や全角「－」で表すことがある
function isHeatExcluded(tx: Transaction): boolean {
  if (tx.is_fixed) return true

  // 各種ハイフン・ダッシュをすべてーに統一して比較
  const p = tx.payee.replace(/[-－‐–—ｰ]/g, 'ー')

  // 「カード」を含む = クレジットカード会社への月次支払い
  if (p.includes('カード')) return true

  // その他の除外キーワード（クレカ・ローン・投資・通信費・決済サービス）
  const keywords = [
    'クレジット', 'オリコ', 'ガクセイシエン', '奨学金', 'ローン',
    '証券', '投信', '積立', '投資',
    'ジエーシービ',  // JCB（ジエ-シ-ビ- → 正規化後）
    'スミトモ',      // 三井住友クレジット
    'クオーク',      // 三井住友クレジット（クオーク）
    'ペイデイ',      // PayDay決済
    '携帯電話',      // au・ドコモ等の携帯料金
  ]
  return keywords.some((k) => p.includes(k))
}

function heatColor(ratio: number): string {
  if (ratio <= 0) return 'transparent'
  // Direction C: coral intensity scale
  const alpha = 0.18 + ratio * 0.67
  return `rgba(251,148,119,${alpha.toFixed(2)})`
}


// ──────────────────────────────────────────────
// 取引詳細パネル（モバイル: ボトムシート / PC: モーダル）
// ──────────────────────────────────────────────
function DayDetailOverlay({
  data,
  categoryMap,
  onClose,
}: {
  data: DayData
  categoryMap: Record<string, Category>
  onClose: () => void
}) {
  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeDismiss({ onDismiss: onClose })

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const catBreakdown = useMemo(() => {
    const map: Record<string, { name: string; color: string | null; total: number }> = {}
    for (const tx of data.transactions) {
      if (tx.amount >= 0) continue
      const cat = tx.category_id ? categoryMap[tx.category_id] : null
      const key = cat?.name ?? '未分類'
      if (!map[key]) map[key] = { name: key, color: cat?.color ?? null, total: 0 }
      map[key].total += Math.abs(tx.amount)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [data, categoryMap])

  const dateLabel = (() => {
    const d = new Date(data.date + 'T00:00:00')
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    return `${parseInt(data.date.slice(5, 7))}月${parseInt(data.date.slice(8))}日（${dow}）`
  })()

  const header = (
    <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${KAI.border}` }}>
      <p className="text-base font-bold" style={{ color: KAI.coral }}>
        {dateLabel}
      </p>
      <button
        onClick={onClose}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-[var(--kai-overlay-weak)]"
        style={{ color: KAI.text3, width: 44, height: 44, minWidth: 44 }}
        aria-label="閉じる"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      </button>
    </div>
  )

  const scrollContent = (
    <div className="flex flex-col gap-3">
      {/* Day totals */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[10px] p-3" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <p className="text-[10px]" style={{ color: KAI.text3 }}>収入</p>
          <p className="text-sm font-bold" style={{ color: KAI.success }}>
            {data.income > 0 ? `+¥${data.income.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="rounded-[10px] p-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
          <p className="text-[10px]" style={{ color: KAI.text3 }}>支出</p>
          <p className="text-sm font-bold" style={{ color: KAI.danger }}>
            {data.expense > 0 ? `-¥${data.expense.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      {catBreakdown.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold" style={{ color: KAI.text3 }}>カテゴリ内訳</p>
          <div className="space-y-1.5">
            {catBreakdown.map((cat) => {
              const pct = data.expense > 0 ? (cat.total / data.expense) * 100 : 0
              return (
                <div key={cat.name}>
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.color ?? KAI.text3 }} />
                      <span className="truncate text-xs" style={{ color: KAI.text2 }}>{cat.name}</span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold" style={{ color: KAI.danger }}>
                      ¥{cat.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full" style={{ background: KAI.border }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: cat.color ?? KAI.text3, opacity: 0.7 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transaction list */}
      {data.transactions.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold" style={{ color: KAI.text3 }}>取引一覧</p>
          <div className="space-y-1.5">
            {data.transactions.map((tx) => {
              const cat = tx.category_id ? categoryMap[tx.category_id] : null
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
                  style={{ background: KAI.overlayWeak, border: `1px solid ${KAI.border}` }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium" style={{ color: KAI.text1 }}>{tx.payee}</span>
                    <div className="flex items-center gap-1.5">
                      {cat && (
                        <>
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cat.color ?? KAI.text3 }} />
                          <span className="text-[11px]" style={{ color: KAI.text3 }}>{cat.name}</span>
                        </>
                      )}
                      {tx.is_fixed && (
                        <span className="rounded px-1 text-[10px] font-semibold" style={{ background: 'rgba(167,139,250,0.15)', color: KAI.violet }}>
                          固定
                        </span>
                      )}
                      {isHeatExcluded(tx) && !tx.is_fixed && (
                        <span className="rounded px-1 text-[10px] font-semibold" style={{ background: 'rgba(34,211,238,0.12)', color: KAI.cyan }}>
                          クレカ
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold" style={{ color: tx.amount > 0 ? KAI.success : KAI.danger }}>
                    {tx.amount > 0 ? '+' : ''}¥{tx.amount.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="py-4 text-center text-sm" style={{ color: KAI.text3 }}>この日の取引はありません</p>
      )}
    </div>
  )

  return (
    <>
      {/* ── Mobile: bottom sheet ── */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
        {/* Sheet */}
        <div
          ref={sheetRef}
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[24px]"
          style={{
            maxHeight: '82vh',
            background: KAI.overlayBg,
            border: `1px solid ${KAI.border2}`,
            borderBottom: 'none',
            boxShadow: '0 -16px 48px rgba(0,0,0,0.6)',
            animation: 'slideUp 0.22s ease-out',
          }}
        >
          {/* Handle + Header — スワイプで閉じるのはここだけ */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="flex shrink-0 justify-center pb-2 pt-3" style={{ cursor: 'grab' }}>
              <div className="h-1 w-10 rounded-full" style={{ background: KAI.text4, opacity: 0.5 }} />
            </div>
            <div className="shrink-0 px-4">
              {header}
            </div>
          </div>
          {/* Scrollable content — スワイプ干渉なし */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {scrollContent}
          </div>
        </div>
      </div>

      {/* ── PC: center modal ── */}
      <div className="hidden lg:block">
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        />
        {/* Modal */}
        <div
          className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-[20px]"
          style={{
            maxHeight: '80vh',
            background: KAI.overlayBg,
            border: `1px solid ${KAI.border2}`,
            boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
            animation: 'fadeScaleIn 0.18s ease-out',
          }}
        >
          <div className="shrink-0 px-6 pt-6">
            {header}
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-3">
            {scrollContent}
          </div>
        </div>
      </div>
    </>
  )
}

// ──────────────────────────────────────────────
// Main CalendarView
// ──────────────────────────────────────────────
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
      if (!map[d]) map[d] = { date: d, income: 0, expense: 0, heatExpense: 0, transactions: [] }
      if (tx.amount > 0) {
        map[d].income += tx.amount
      } else {
        const abs = Math.abs(tx.amount)
        map[d].expense += abs
        // ヒートマップ: 固定費・クレカ引き落としは除外
        if (!isHeatExcluded(tx)) {
          map[d].heatExpense += abs
        }
      }
      map[d].transactions.push(tx)
    }
    return map
  }, [transactions])

  const maxHeat = useMemo(
    () => Math.max(1, ...Object.values(dayMap).map((d) => d.heatExpense)),
    [dayMap]
  )

  const excludedCount = useMemo(
    () => transactions.filter((tx) => tx.amount < 0 && isHeatExcluded(tx)).length,
    [transactions]
  )

  const selectedData = selectedDate
    ? (dayMap[selectedDate] ?? { date: selectedDate, income: 0, expense: 0, heatExpense: 0, transactions: [] })
    : null

  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)])

  const today = todayJST()

  return (
    <>
      {/* animation styles */}
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeScaleIn { from { opacity:0; transform: translate(-50%,-50%) scale(0.95); } to { opacity:1; transform: translate(-50%,-50%) scale(1); } }
      `}</style>

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className="py-1.5 text-xs font-semibold" style={{ color: i === 0 ? KAI.danger : i === 6 ? KAI.blue : KAI.text3 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />

          const dateStr = `${month}-${String(day).padStart(2, '0')}`
          const data = dayMap[dateStr]
          const ratio = data ? data.heatExpense / maxHeat : 0
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const dow = (firstDay + day - 1) % 7

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className="relative flex min-h-[52px] flex-col items-start justify-between rounded-[12px] p-2 text-left transition-all active:scale-95 sm:min-h-[58px]"
              style={{
                background: isSelected ? 'rgba(251,148,119,0.12)' : (ratio > 0 ? heatColor(ratio) : KAI.overlayWeak),
                border: isSelected
                  ? '1.5px solid rgba(251,148,119,0.6)'
                  : isToday
                  ? '1.5px solid rgba(251,148,119,0.3)'
                  : `1px solid ${KAI.overlayBorder}`,
              }}
            >
              {/* Date number */}
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: isToday ? KAI.coral : 'transparent',
                  color: isToday ? KAI.bg : dow === 0 ? KAI.danger : dow === 6 ? KAI.blue : KAI.text2,
                }}
              >
                {day}
              </span>

              {/* Bottom: expense amount + dot indicators */}
              {data && (
                <div className="flex w-full flex-col items-start gap-0.5">
                  {data.expense > 0 && (
                    <span className="text-[8px] font-bold leading-none" style={{ color: KAI.danger, fontFamily: 'var(--font-jetbrains),monospace' }}>
                      {data.expense >= 10000 ? `${(data.expense / 10000).toFixed(data.expense >= 100000 ? 0 : 1)}万` : `${Math.round(data.expense / 100) * 100}`}
                    </span>
                  )}
                  <div className="flex items-center gap-[3px]">
                    {data.income > 0 && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KAI.success }} />
                    )}
                    {data?.transactions.some((t) => t.is_fixed) && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KAI.violet }} />
                    )}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Heatmap bar */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold" style={{ color: KAI.text3 }}>
            日別支出ヒートマップ{' '}
            <span style={{ color: 'rgba(139,139,160,0.6)', fontWeight: 400 }}>
              （固定費・クレカ除外 — {excludedCount}件除外中）
            </span>
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: KAI.text3 }}>少</span>
            {[0.1, 0.35, 0.6, 0.85, 1].map((r) => (
              <span key={r} className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: heatColor(r) }} />
            ))}
            <span className="text-[10px]" style={{ color: KAI.text3 }}>多</span>
          </div>
        </div>
        <div className="flex gap-[2px]">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dateStr = `${month}-${String(i + 1).padStart(2, '0')}`
            const data = dayMap[dateStr]
            const ratio = data ? data.heatExpense / maxHeat : 0
            const isSelected = selectedDate === dateStr
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className="flex-1 rounded-[3px] transition-all hover:opacity-80"
                style={{
                  height: 22,
                  background: ratio > 0 ? heatColor(ratio) : KAI.overlayWeak,
                  border: isSelected ? '1px solid rgba(251,148,119,0.7)' : '1px solid transparent',
                }}
                title={`${i + 1}日 ¥${(data?.expense ?? 0).toLocaleString()}`}
              />
            )
          })}
        </div>
        <div className="mt-0.5 flex justify-between text-[10px]" style={{ color: 'rgba(139,139,160,0.6)' }}>
          <span>1日</span><span>{daysInMonth}日</span>
        </div>
      </div>

      {/* Overlay (bottom sheet / modal) */}
      {selectedData && (
        <DayDetailOverlay
          data={selectedData}
          categoryMap={categoryMap}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  )
}
