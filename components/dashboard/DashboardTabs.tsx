'use client'

import { useState, useRef, useCallback } from 'react'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { QuarterlyInsightCard } from '@/components/dashboard/QuarterlyInsightCard'
import { NowTab } from '@/components/dashboard/NowTab'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  streak?: number
}

const TABS = ['今月', 'AI'] as const
const GRADIENTS = [
  'linear-gradient(135deg,var(--kai-coral,#fb9477),var(--kai-blue,#7aa7ff))',
  'linear-gradient(135deg,var(--kai-violet,#a78bfa),var(--kai-blue,#7aa7ff))',
] as const

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
        style={{ display: 'flex', gap: 6, padding: '0 0 10px' }}
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
                padding: 9,
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                color: active ? '#0c0a14' : KAI.text3,
                background: active ? GRADIENTS[i] : 'rgba(255,255,255,.04)',
                border: active ? 'none' : `1px solid ${KAI.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all .18s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {i === 1 && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
                </svg>
              )}
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
        {tab === 1 && (
          <div className="space-y-3">
            <AiSummaryCard />
            <QuarterlyInsightCard />
            <a
              href="/summary"
              style={{
                display: 'block',
                padding: '14px 16px',
                background: 'linear-gradient(135deg,rgba(167,139,250,.14),rgba(122,167,255,.1))',
                border: '1px solid rgba(167,139,250,.3)',
                borderRadius: 16,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: KAI.violet,
                textDecoration: 'none',
              }}
            >
              AIに相談する →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
