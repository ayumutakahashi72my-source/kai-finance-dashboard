'use client'

import dynamic from 'next/dynamic'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AnomalyBanner } from '@/components/dashboard/AnomalyBanner'
import { yen } from '@/lib/kai-tokens'
import { jstNow } from '@/lib/jst'
import type { Transaction } from '@/lib/types'
import { BLUE, VIOLET, UP, DOWN, buildMonthlyData } from './dashboard-utils'
import type { CategoryData } from './dashboard-utils'
import { DesktopKpiCard, DesktopRecentTx, DesktopCategoryCard } from './DesktopCards'
import { GoalSection } from './GoalSection'
import { StreakCard } from './StreakCard'

const DesktopTrendChart = dynamic(
  () => import('./_DesktopTrendChart').then((m) => m.DesktopTrendChart),
  { ssr: false, loading: () => <div style={{ height: 240 }} /> }
)

export function DesktopNow({ transactions, allTransactions, month, streak, categoryData }: {
  transactions: Transaction[]; allTransactions: Transaction[]; month: string; streak: number; categoryData: CategoryData
}) {
  const monthlyData = buildMonthlyData(allTransactions)
  const prev = monthlyData[monthlyData.length - 2]

  const expense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const income  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const saveRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const now2 = jstNow()
  const dayElapsed = now2.getUTCDate()
  const daysTotal  = new Date(Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth() + 1, 0)).getUTCDate()
  const pacePct    = Math.round((dayElapsed / daysTotal) * 100)
  const expDeltaPct  = prev.exp > 0 ? Math.round(((expense - prev.exp) / prev.exp) * 100) : 0
  const incDeltaPct  = prev.inc > 0 ? Math.round(((income - prev.inc) / prev.inc) * 100) : 0
  const saveSeries   = monthlyData.map((d) => (d.inc > 0 ? Math.round(((d.inc - d.exp) / d.inc) * 100) : 0))

  return (
    <div className="hidden lg:flex lg:flex-col" style={{ gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <DesktopKpiCard label="今月の支出" value={yen(expense)} deltaGood={expDeltaPct <= 0} delta={`${Math.abs(expDeltaPct)}%`} color={DOWN} series={monthlyData.map((d) => d.exp)} delay={0}/>
        <DesktopKpiCard label="今月の収入" value={yen(income)} deltaGood={incDeltaPct >= 0} delta={`${Math.abs(incDeltaPct)}%`} color={UP} series={monthlyData.map((d) => d.inc)} delay={0.04}/>
        <DesktopKpiCard label="貯蓄率" value={String(saveRate)} unit="%" deltaGood={saveRate >= 0} delta={`${saveRate}%`} color={BLUE} series={saveSeries} delay={0.08}/>
        <DesktopKpiCard label="日付ペース" value={String(pacePct)} unit="%" deltaGood={true} delta={`day ${dayElapsed}/${daysTotal}`} color={VIOLET} series={monthlyData.map((_, i) => Math.round(((i + 1) / monthlyData.length) * 100))} delay={0.12}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <DesktopTrendChart monthlyData={monthlyData} />
        <DesktopCategoryCard categoryData={categoryData}/>
      </div>

      <AnomalyBanner month={month} />
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 12 }}>
        <DesktopRecentTx transactions={transactions}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GoalSection transactions={transactions} />
          <AiSummaryCard/>
          <StreakCard streak={streak}/>
        </div>
      </div>
    </div>
  )
}
