'use client'

import { AnomalyBanner } from '@/components/dashboard/AnomalyBanner'
import type { Transaction } from '@/lib/types'
import { buildCategoryData } from './dashboard-utils'
import { CategoryRingHero } from './CategoryRingHero'
import { CategoryChips } from './CategoryChips'
import { DashKpiRow } from './DashKpiRow'
import { GoalSection } from './GoalSection'
import { DesktopNow } from './DesktopNow'

export function NowTab({ transactions, allTransactions, month, streak }: {
  transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number
}) {
  const categoryData = buildCategoryData(transactions)

  return (
    <>
      <div className="lg:hidden space-y-3">
        <AnomalyBanner month={month} />
        <CategoryRingHero categoryData={categoryData} />
        <GoalSection transactions={transactions} />
        <CategoryChips categoryData={categoryData} />
        <DashKpiRow transactions={transactions} />
      </div>
      <DesktopNow transactions={transactions} allTransactions={allTransactions} month={month} streak={streak} categoryData={categoryData}/>
    </>
  )
}
