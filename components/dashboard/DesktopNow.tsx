'use client'

import dynamic from 'next/dynamic'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AnomalyBanner } from '@/components/dashboard/AnomalyBanner'
import { yen } from '@/lib/kai-tokens'
import { monthLabel, monthProgress } from '@/lib/jst'
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
  // 前月比は「表示中の月」の前月と比較する（常に当月基準だと過去月表示で比較対象がずれる）
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(Date.UTC(y, m - 2, 1))
  const prevKey  = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`
  const prevTx   = allTransactions.filter((t) => t.occurred_on.startsWith(prevKey))
  const prev = {
    exp: prevTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    inc: prevTx.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0),
  }
  const periodLabel = monthLabel(month)

  const expense = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const income  = transactions.filter((t) => t.amount >= 0).reduce((s, t) => s + t.amount, 0)
  const saveRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const { dayElapsed, daysTotal } = monthProgress(month)
  const pacePct    = Math.round((dayElapsed / daysTotal) * 100)
  const expDeltaPct  = prev.exp > 0 ? Math.round(((expense - prev.exp) / prev.exp) * 100) : 0
  const incDeltaPct  = prev.inc > 0 ? Math.round(((income - prev.inc) / prev.inc) * 100) : 0
  const prevSaveRate = prev.inc > 0 ? Math.round(((prev.inc - prev.exp) / prev.inc) * 100) : 0
  const saveDeltaPt  = saveRate - prevSaveRate
  const saveSeries   = monthlyData.map((d) => (d.inc > 0 ? Math.round(((d.inc - d.exp) / d.inc) * 100) : 0))

  return (
    <div className="hidden lg:flex lg:flex-col" style={{ gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <DesktopKpiCard label={`${periodLabel}の支出`} value={yen(expense)} deltaGood={expDeltaPct <= 0} delta={`${Math.abs(expDeltaPct)}%`} deltaUp={expDeltaPct === 0 ? undefined : expDeltaPct > 0} color={DOWN} series={monthlyData.map((d) => d.exp)} delay={0}/>
        <DesktopKpiCard label={`${periodLabel}の収入`} value={yen(income)} deltaGood={incDeltaPct >= 0} delta={`${Math.abs(incDeltaPct)}%`} deltaUp={incDeltaPct === 0 ? undefined : incDeltaPct > 0} color={UP} series={monthlyData.map((d) => d.inc)} delay={0.04}/>
        <DesktopKpiCard label="貯蓄率" value={String(saveRate)} unit="%" deltaGood={saveDeltaPt >= 0} delta={`${Math.abs(saveDeltaPt)}pt`} deltaUp={saveDeltaPt === 0 ? undefined : saveDeltaPt > 0} color={BLUE} series={saveSeries} delay={0.08}/>
        <DesktopKpiCard label="日付ペース" value={String(pacePct)} unit="%" deltaGood={true} delta={`day ${dayElapsed}/${daysTotal}`} deltaSuffix="" color={VIOLET} series={monthlyData.map((_, i) => Math.round(((i + 1) / monthlyData.length) * 100))} delay={0.12}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <DesktopTrendChart monthlyData={monthlyData} />
        <DesktopCategoryCard categoryData={categoryData}/>
      </div>

      <AnomalyBanner month={month} />
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: 12 }}>
        <DesktopRecentTx transactions={transactions}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GoalSection transactions={transactions} month={month} />
          <AiSummaryCard/>
          <StreakCard streak={streak}/>
        </div>
      </div>
    </div>
  )
}
