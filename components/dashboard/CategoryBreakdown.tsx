'use client'

import type { Transaction } from '@/lib/types'
import { CategoryIcon } from '@/components/ui/CategoryIcon'

const CAT_PALETTE = [
  '#5eead4', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb923c', '#fbbf24', '#4ade80',
  '#fb7185', '#818cf8', '#34d399', '#f59e0b',
  '#e879f9', '#38bdf8', '#a3e635',
]
function pickColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0
  return CAT_PALETTE[Math.abs(h) % CAT_PALETTE.length]
}

export function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter((t) => t.amount < 0)

  const byCategory = Object.entries(
    expenses.reduce<Record<string, { amount: number; color: string; icon?: string }>>((acc, t) => {
      // 親カテゴリがあれば親でロールアップ
      const name = t.categories?.parent?.name ?? t.categories?.name ?? 'その他'
      const color =
        t.categories?.parent?.color ??
        t.categories?.color ??
        pickColor(name)
      const icon = t.categories?.icon ?? undefined
      acc[name] = { amount: (acc[name]?.amount ?? 0) + Math.abs(t.amount), color, icon }
      return acc
    }, {})
  ).sort((a, b) => b[1].amount - a[1].amount)

  const total = byCategory.reduce((s, [, { amount }]) => s + amount, 0)
  const top4 = byCategory.slice(0, 4)

  const alertCount = 0 // budget data not available yet

  return (
    <div
      className="rounded-[18px] p-4"
      style={{
        background: 'rgba(20,22,32,0.66)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="lbl">カテゴリ別</p>
        {alertCount > 0 && (
          <span
            className="mono rounded-full px-2.5 py-[3px] text-[11px] font-bold"
            style={{
              color: '#fb7185',
              background: 'rgba(251,113,133,0.10)',
              border: '1px solid rgba(251,113,133,0.25)',
            }}
          >
            ⚠ {alertCount}件超過
          </span>
        )}
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-[#5e5e72]">支出データがありません</p>
      ) : (
        <div className="space-y-3">
          {top4.map(([name, { amount, color, icon }], i) => {
            const pct = Math.round((amount / total) * 100)
            return (
              <div key={name} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="mb-[5px] flex items-baseline justify-between">
                  <span className="text-[14px] font-medium text-[#f0f0f5]" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {icon && <CategoryIcon name={icon} size={14} color={color} />}
                    {name}
                  </span>
                  <span className="mono text-[13px] text-[#c4c4d0]">
                    ¥{amount.toLocaleString()}{' '}
                    <span className="text-[#8b8ba0]">({pct}%)</span>
                  </span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: color,
                      boxShadow: `0 0 8px ${color}66`,
                      transformOrigin: 'left',
                      animation: 'kai-bar-grow-x 1.2s cubic-bezier(0.16,1,0.3,1) both',
                      animationDelay: `${0.1 + i * 0.08}s`,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
