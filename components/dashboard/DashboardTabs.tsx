'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'
import { CashflowCard } from '@/components/budget/CashflowCard'
import { SavingsRateTracker } from '@/components/budget/SavingsRateTracker'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import { NowTab } from '@/components/dashboard/NowTab'
import { CORAL, TEXT3 } from './dashboard-utils'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  streak?: number
}

const TABS = ['ホーム', '分析', '予算'] as const

export function DashboardTabs({ transactions, allTransactions, month, streak: streakProp = 0 }: Props) {
  const [tab, setTab] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next = tab
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (tab + 1) % TABS.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (tab - 1 + TABS.length) % TABS.length
    } else if (e.key === 'Home') {
      next = 0
    } else if (e.key === 'End') {
      next = TABS.length - 1
    } else {
      return
    }
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }, [tab])

  return (
    <div className="px-[18px] py-4 lg:px-[30px]">
      <div
        role="tablist"
        style={{ display: 'flex', gap: 0, padding: '0 0 12px' }}
        onKeyDown={handleKeyDown}
      >
        {TABS.map((t, i) => {
          const active = tab === i
          return (
            <button
              key={t}
              ref={(el) => { tabRefs.current[i] = el }}
              id={`dash-tab-${i}`}
              role="tab"
              aria-selected={active}
              aria-controls={`dash-tabpanel-${i}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                padding: 8,
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                color: active ? CORAL : TEXT3,
                background: 'none',
                border: 'none',
                borderBottom: active ? `2px solid ${CORAL}` : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .18s',
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`dash-tabpanel-${tab}`}
        aria-labelledby={`dash-tab-${tab}`}
        className="space-y-3"
        style={{ animation: 'kai-rise .4s ease-out both' }}
        key={tab}
      >
        {tab === 0 && <NowTab transactions={transactions} allTransactions={allTransactions} month={month} streak={streakProp} />}
        {tab === 1 && <AnalyticsTab allTransactions={allTransactions} month={month} />}
        {tab === 2 && (
          <>
            <CashflowCard month={month} />
            <BudgetDashboard month={month} />
            <SavingsRateTracker currentMonth={month} />
            <FixedExpenseCard />
          </>
        )}
      </div>
    </div>
  )
}
