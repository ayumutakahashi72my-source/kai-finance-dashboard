'use client'

import { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { QuarterlyInsightCard } from '@/components/dashboard/QuarterlyInsightCard'
import { NowTab } from '@/components/dashboard/NowTab'
import { CORAL, CORALG, TEXT3, BORDER } from './dashboard-utils'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

function StrategyTab() {
  return (
    <div className="space-y-3">
      <AiSummaryCard />
      <QuarterlyInsightCard />
      <div className="kai-rise" style={{ animationDelay: '140ms' }}>
        <AiChatPanel />
      </div>
    </div>
  )
}

interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  streak?: number
}

const TABS = ['NOW', '分析', 'AI戦略'] as const

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
        className="mb-4 inline-flex gap-1 rounded-[12px] p-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
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
                fontFamily: 'var(--font-mono),monospace',
                background: active ? 'rgba(251,148,119,0.12)' : 'transparent',
                color: active ? CORAL : TEXT3,
                boxShadow: active ? `0 0 8px ${CORALG}` : 'none',
                border: 'none', borderRadius: 9, padding: '8px 18px',
                fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
                cursor: 'pointer', minHeight: 38, transition: 'all .18s',
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`dash-tabpanel-${tab}`} aria-labelledby={`dash-tab-${tab}`}>
        {tab === 0 && <NowTab transactions={transactions} allTransactions={allTransactions} month={month} streak={streakProp} />}
        {tab === 1 && <AnalyticsTab allTransactions={allTransactions} month={month} />}
        {tab === 2 && <StrategyTab />}
      </div>
    </div>
  )
}
