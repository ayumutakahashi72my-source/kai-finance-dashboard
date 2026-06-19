'use client'

import { useState, useRef, useCallback } from 'react'
import { AiChatPanel } from '@/components/dashboard/AiChatPanel'
import { SummaryContent } from '@/components/dashboard/SummaryContent'
import { QuarterlyInsightCard } from '@/components/dashboard/QuarterlyInsightCard'
import { KAI } from '@/lib/kai-tokens'

const TABS = ['チャット', 'サマリー'] as const

interface Props {
  initialTab?: number
}

export function AiPageTabs({ initialTab = 0 }: Props) {
  const [tab, setTab] = useState(initialTab)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next = tab
    if (e.key === 'ArrowRight') {
      next = (tab + 1) % TABS.length
    } else if (e.key === 'ArrowLeft') {
      next = (tab - 1 + TABS.length) % TABS.length
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
            id={`ai-tab-${i}`}
            role="tab"
            aria-selected={tab === i}
            aria-controls={`ai-tabpanel-${i}`}
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

      <div
        role="tabpanel"
        id={`ai-tabpanel-${tab}`}
        aria-labelledby={`ai-tab-${tab}`}
        className="space-y-4"
        style={{ animation: 'kai-rise .4s ease-out both' }}
        key={tab}
      >
        {tab === 0 && <AiChatPanel alwaysOpen />}
        {tab === 1 && (
          <>
            <SummaryContent />
            <QuarterlyInsightCard />
          </>
        )}
      </div>
    </div>
  )
}
