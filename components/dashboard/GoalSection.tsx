'use client'

import { useQuery } from '@tanstack/react-query'
import { GoalBanner } from '@/components/dashboard/GoalBanner'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import type { FinancialGoal } from '@/components/dashboard/GoalProgressCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

export function GoalSection({ transactions }: { transactions: Transaction[] }) {
  const { data, isLoading, error } = useQuery<{ goals: FinancialGoal[] }>({
    queryKey: ['goals'],
    queryFn: async () => {
      const r = await fetch('/api/goals')
      if (!r.ok) throw new Error('目標の読み込みに失敗しました')
      return r.json()
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  })

  if (isLoading) return <Skeleton variant="panel" className="h-20" />

  if (error) {
    return (
      <div style={{ background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.22)', borderRadius: 14, padding: '12px 14px', color: KAI.danger, fontSize: 12 }}>
        目標の読み込みに失敗しました
      </div>
    )
  }

  const goals = data?.goals ?? []
  const currentMonthExpense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const currentMonthIncome  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)

  if (goals.length === 0) return <GoalBanner />

  const aggregate = goals.length > 1
    ? {
        totalCount: goals.length,
        totalMonthlySavings: goals.reduce((s, g) => s + (g.monthly_savings_target ?? 0), 0),
        totalSpendingLimit: goals.every((g) => g.monthly_spending_limit !== null)
          ? Math.max(0, currentMonthIncome - goals.reduce((s, g) => s + (g.monthly_savings_target ?? 0), 0))
          : null,
      }
    : undefined

  return (
    <GoalProgressCard
      goal={goals[0]}
      currentMonthExpense={currentMonthExpense}
      currentMonthIncome={currentMonthIncome}
      aggregate={aggregate}
    />
  )
}
