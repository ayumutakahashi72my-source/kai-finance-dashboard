'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { AiSummaryCard } from '@/components/dashboard/AiSummaryCard'
import { QuarterlyInsightCard } from '@/components/dashboard/QuarterlyInsightCard'
import { NowTab } from '@/components/dashboard/NowTab'
import { Icon } from '@/components/kai/shared'
import { CORAL, TEXT3, BORDER } from './dashboard-utils'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

const VIOLET = KAI.violet
const BLUE = KAI.blue

function AiDigestTab() {
  return (
    <div className="space-y-3">
      <AiSummaryCard />
      <QuarterlyInsightCard />
      <Link
        href="/summary"
        className="kai-rise"
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(167,139,250,0.14), rgba(122,167,255,0.1))',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: 16,
          textDecoration: 'none',
          cursor: 'pointer',
          animationDelay: '140ms',
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(122,167,255,0.3))',
          border: '1px solid rgba(167,139,250,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: VIOLET,
        }}>
          <Icon name="sparkle" size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#f0f0f5' }}>AIに相談する</div>
          <div style={{ fontSize: 11, color: '#8b8ba0', marginTop: 2 }}>チャットで深掘り・質問できます</div>
        </div>
        <div style={{ color: VIOLET }}>
          <Icon name="arrowRight" size={18} />
        </div>
      </Link>
    </div>
  )
}

interface Props {
  transactions: Transaction[]
  allTransactions: Transaction[]
  month: string
  streak?: number
}

const TABS = ['今月', 'AI'] as const

const TAB_GRADIENTS = [
  `linear-gradient(135deg, ${CORAL}, ${BLUE})`,
  `linear-gradient(135deg, ${VIOLET}, ${BLUE})`,
]

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
        className="mb-4 flex gap-[6px]"
        style={{ padding: '0 0 2px' }}
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
                padding: '9px',
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                color: active ? '#0c0a14' : TEXT3,
                background: active ? TAB_GRADIENTS[i] : 'rgba(255,255,255,0.04)',
                border: active ? 'none' : `1px solid ${BORDER}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all .18s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              {i === 1 && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={active ? '#0c0a14' : VIOLET} strokeWidth="2">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
                </svg>
              )}
              {t}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`dash-tabpanel-${tab}`} aria-labelledby={`dash-tab-${tab}`}>
        {tab === 0 && <NowTab transactions={transactions} allTransactions={allTransactions} month={month} streak={streakProp} />}
        {tab === 1 && <AiDigestTab />}
      </div>
    </div>
  )
}
