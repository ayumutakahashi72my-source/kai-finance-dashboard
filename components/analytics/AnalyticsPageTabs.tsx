'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'
import { CashflowCard } from '@/components/budget/CashflowCard'
import { SavingsRateTracker } from '@/components/budget/SavingsRateTracker'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

const TABS = ['月次', '予算', '貯蓄', '固定費'] as const

interface Props {
  month: string
  allTransactions: Transaction[]
}

export function AnalyticsPageTabs({ month, allTransactions }: Props) {
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
    <div>
      <div
        role="tablist"
        style={{
          display: 'flex', gap: 5,
          background: KAI.overlayWeak,
          borderRadius: 12, padding: 3,
          marginBottom: 16,
        }}
        onKeyDown={handleKeyDown}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => { tabRefs.current[i] = el }}
            id={`analytics-tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls={`analytics-tabpanel-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            style={{
              flex: 1, padding: '7px 4px',
              borderRadius: 9,
              background: tab === i ? KAI.bgCard : 'none',
              border: tab === i ? `1px solid ${KAI.border2}` : 'none',
              fontSize: 11.5,
              fontWeight: tab === i ? 700 : 400,
              color: tab === i ? KAI.text1 : KAI.text3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .18s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`analytics-tabpanel-${tab}`} aria-labelledby={`analytics-tab-${tab}`} className="space-y-3" style={{ animation: 'kai-rise .4s ease-out both' }} key={tab}>
        {tab === 0 && (
          <>
            <CashflowCard month={month} />
            <AnalyticsTab allTransactions={allTransactions} month={month} />
          </>
        )}
        {tab === 1 && <BudgetDashboard month={month} />}
        {tab === 2 && <SavingsRateTracker currentMonth={month} />}
        {tab === 3 && <FixedExpenseCard />}
      </div>
    </div>
  )
}
