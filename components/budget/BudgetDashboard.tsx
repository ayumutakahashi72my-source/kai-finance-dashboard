'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BudgetSuggestCard } from './BudgetSuggestCard'
import { SpendingPatternCard } from './SpendingPatternCard'

interface Suggestion {
  category_name: string
  suggested_amount: number
  reason: string
}

interface BudgetData {
  year: number
  month: number
  suggestions: Suggestion[]
  spending_pattern: { summary: string; habits: string[] }
  created_at: string
}

interface Transaction {
  amount: number
  categories: { name: string } | null
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function computeScore(suggestions: Suggestion[], actualByCategory: Record<string, number>): number {
  if (!suggestions.length) return 0
  let totalBudget = 0
  let totalWithin = 0
  for (const s of suggestions) {
    const actual = actualByCategory[s.category_name] ?? 0
    totalBudget += s.suggested_amount
    totalWithin += Math.min(actual, s.suggested_amount)
  }
  if (totalBudget === 0) return 100
  return Math.round((totalWithin / totalBudget) * 100)
}

function ScoreRing({ score }: { score: number }) {
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)
  const color = score >= 80 ? '#5eead4' : score >= 60 ? '#fbbf24' : '#fb7185'
  const grade = score >= 90 ? 'S' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : 'D'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle
          cx={50} cy={50} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x={50} y={46} textAnchor="middle" fill={color} fontSize={22} fontWeight={800} fontFamily="monospace">
          {grade}
        </text>
        <text x={50} y={63} textAnchor="middle" fill="#8b8ba0" fontSize={12} fontFamily="monospace">
          {score}%
        </text>
      </svg>
      <p className="text-[12px] text-[#8b8ba0]">今月の予算達成スコア</p>
    </div>
  )
}

export function BudgetDashboard() {
  const qc = useQueryClient()
  const month = currentMonthStr()

  const { data: budgetRes, isLoading: budgetLoading } = useQuery<{ data: BudgetData | null }>({
    queryKey: ['budget_suggest'],
    queryFn: () => fetch('/api/budget/suggest').then((r) => r.json()),
  })

  const { data: txRes, isLoading: txLoading } = useQuery<{ data: Transaction[] }>({
    queryKey: ['transactions', month],
    queryFn: () => fetch(`/api/transactions?month=${month}`).then((r) => r.json()),
  })

  const { mutate, isPending, error: mutateError } = useMutation({
    mutationFn: () =>
      fetch('/api/budget/suggest', { method: 'POST' }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? '生成失敗')
        return json
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budget_suggest'] }),
  })

  const budget = budgetRes?.data
  const transactions = txRes?.data ?? []
  const isLoading = budgetLoading || txLoading

  // カテゴリ別実績集計（支出のみ: amount < 0）
  const actualByCategory: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.amount >= 0) continue
    const name = tx.categories?.name ?? 'その他'
    actualByCategory[name] = (actualByCategory[name] ?? 0) + Math.abs(tx.amount)
  }

  const score = budget ? computeScore(budget.suggestions, actualByCategory) : null

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-28 animate-pulse rounded-[18px] bg-white/5" />
        <div className="h-64 animate-pulse rounded-[18px] bg-white/5" />
        <div className="h-40 animate-pulse rounded-[18px] bg-white/5" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Score + generate button */}
      <div
        className="reveal-up flex items-center justify-between rounded-[18px] px-5 py-4"
        style={{
          background: 'rgba(20,22,32,0.7)',
          backdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {score !== null ? (
          <ScoreRing score={score} />
        ) : (
          <div className="text-sm text-[#5e5e72]">予算提案を生成してスコアを確認</div>
        )}

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="rounded-[12px] px-4 py-2.5 text-[13px] font-semibold text-[#5eead4] transition-colors hover:bg-[#5eead4]/10 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ border: '1px solid rgba(94,234,212,0.28)' }}
          >
            {isPending ? '生成中…' : budget ? '⟲ 再生成' : '今月分を生成'}
          </button>
          {budget && (
            <p className="text-[11px] text-[#5e5e72]">
              {budget.year}年{budget.month}月 生成済み
            </p>
          )}
          {mutateError && (
            <p className="text-[11px] text-[#fb7185]">{(mutateError as Error).message}</p>
          )}
        </div>
      </div>

      {budget ? (
        <>
          <div className="reveal-up" style={{ animationDelay: '60ms' }}>
            <BudgetSuggestCard
              suggestions={budget.suggestions}
              actualByCategory={actualByCategory}
            />
          </div>
          <div className="reveal-up" style={{ animationDelay: '120ms' }}>
            <SpendingPatternCard pattern={budget.spending_pattern} />
          </div>
        </>
      ) : (
        <div
          className="reveal-up flex flex-col items-center gap-3 rounded-[18px] py-12 text-center"
          style={{
            background: 'rgba(20,22,32,0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[15px] text-[#8b8ba0]">まだ今月の予算提案がありません</p>
          <p className="text-[13px] text-[#5e5e72]">「今月分を生成」ボタンを押してください</p>
        </div>
      )}
    </div>
  )
}
