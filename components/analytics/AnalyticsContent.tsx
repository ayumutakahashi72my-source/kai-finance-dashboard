'use client'

import dynamic from 'next/dynamic'
import { CashflowCard } from '@/components/budget/CashflowCard'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

export function AnalyticsContent({ month, allTransactions }: { month: string; allTransactions: Transaction[] }) {
  return (
    <>
      <CashflowCard month={month} />
      <AnalyticsTab allTransactions={allTransactions} month={month} />
    </>
  )
}
