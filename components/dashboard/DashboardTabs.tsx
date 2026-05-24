'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { NowTab } from '@/components/dashboard/NowTab'
import { CORAL, CORALG, TEXT3, BORDER } from './dashboard-utils'
import type { Transaction } from '@/lib/types'

const AnalyticsTab = dynamic(
  () => import('@/components/dashboard/AnalyticsTab').then((m) => m.AnalyticsTab),
  { ssr: false, loading: () => <div style={{ minHeight: 300 }} /> }
)

/* ─── Strategy tab ─── */
function StrategyTab() {
  return (
    <div className="space-y-3">
      <AiSummaryCard />
      <div className="kai-rise" style={{ animationDelay: '140ms' }}>
        <AiChatPanel />
      </div>
    </div>
  )
}

/* ─── main component ─── */
interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  displayName?: string
  streak?: number
}

const TABS = ['NOW', '分析', 'AI戦略'] as const

export function DashboardTabs({ transactions, allTransactions, month, streak: streakProp = 0 }: Props) {
  const [tab, setTab] = useState(0)

  return (
    <div className="px-[18px] py-4 lg:px-[30px]">
      <div
        className="mb-4 inline-flex gap-1 rounded-[12px] p-1"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}` }}
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            aria-pressed={tab === i}
            style={{
              fontFamily: 'var(--font-mono),monospace',
              background: tab === i ? 'rgba(251,148,119,0.12)' : 'transparent',
              color: tab === i ? CORAL : TEXT3,
              boxShadow: tab === i ? `0 0 8px ${CORALG}` : 'none',
              border: 'none', borderRadius: 9, padding: '8px 18px',
              fontSize: 12, fontWeight: 700, letterSpacing: '.04em',
              cursor: 'pointer', minHeight: 38, transition: 'all .18s',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <NowTab transactions={transactions} allTransactions={allTransactions} month={month} streak={streakProp} />}
      {tab === 1 && <AnalyticsTab allTransactions={allTransactions} month={month} />}
      {tab === 2 && <StrategyTab />}
    </div>
  )
}
