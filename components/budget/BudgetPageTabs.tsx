'use client'

import { useState, useRef, useCallback } from 'react'
import { BudgetDashboard } from '@/components/budget/BudgetDashboard'
import { SavingsRateTracker } from '@/components/budget/SavingsRateTracker'
import { FixedExpenseCard } from '@/components/budget/FixedExpenseCard'
import { KAI } from '@/lib/kai-tokens'

const TABS = ['予算', '貯蓄', '固定費'] as const

interface Props {
  month: string
  initialTab?: number
}

export function BudgetPageTabs({ month, initialTab = 0 }: Props) {
  const [tab, setTab] = useState(initialTab)
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
            id={`budget-tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls={`budget-tabpanel-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            style={{
              flex: 1, padding: '7px 4px',
              borderRadius: 9,
              background: tab === i ? KAI.bgCard : 'none',
              border: tab === i ? `1px solid ${KAI.border2}` : '1px solid transparent',
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

      <div role="tabpanel" id={`budget-tabpanel-${tab}`} aria-labelledby={`budget-tab-${tab}`} className="space-y-3" style={{ animation: 'kai-rise .4s ease-out both' }} key={tab}>
        {tab === 0 && <BudgetDashboard month={month} />}
        {tab === 1 && <SavingsRateTracker currentMonth={month} />}
        {tab === 2 && <FixedExpenseCard />}
      </div>
    </div>
  )
}
