'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'
import { renderMarkdown } from '@/lib/markdown'

interface QuarterlyInsight {
  year: number
  quarter: number
  content: string
  model: string
  created_at: string
}

export function QuarterlyInsightCard() {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState(0)

  const { data, isLoading } = useQuery<{ insights: QuarterlyInsight[] }>({
    queryKey: ['quarterly_insights'],
    queryFn: async () => {
      const r = await fetch('/api/ai/quarterly')
      if (!r.ok) throw new Error('四半期分析の読み込みに失敗しました')
      return r.json()
    },
    staleTime: 1000 * 60 * 60,
  })

  const insights = data?.insights ?? []
  if (!isLoading && insights.length === 0) return null

  const current = insights[selected]

  return (
    <div
      className="reveal-up rounded-[18px] p-4"
      style={{
        background: 'linear-gradient(135deg,rgba(167,139,250,0.10),rgba(122,167,255,0.06),rgba(20,22,32,0.66))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(167,139,250,0.20)',
        animationDelay: '200ms',
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-[7px]"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#7dd3fc)', flexShrink: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="rgba(10,10,16,0.85)" strokeWidth="1.4"/>
            <path d="M6 3.5V6L7.5 7.5" stroke="rgba(10,10,16,0.85)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </span>
        <span className="text-[13px] font-bold text-[#c4b5fd]">四半期深層分析</span>
        <span className="ml-auto text-[10px]" style={{ color: KAI.text4 }}>Opus</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="line-md" />
          <Skeleton variant="line-sm" className="w-4/5" />
          <Skeleton variant="line-sm" className="w-3/5" />
        </div>
      ) : current ? (
        <>
          {/* Quarter selector（複数ある場合） */}
          {insights.length > 1 && (
            <div className="mb-3 flex gap-1.5 flex-wrap">
              {insights.map((ins, i) => (
                <button
                  key={`${ins.year}Q${ins.quarter}`}
                  onClick={() => { setSelected(i); setExpanded(false) }}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 7,
                    background: selected === i ? 'rgba(167,139,250,0.18)' : KAI.overlayWeak,
                    border: `1px solid ${selected === i ? 'rgba(167,139,250,0.40)' : KAI.border2}`,
                    color: selected === i ? '#c4b5fd' : KAI.text4,
                    cursor: 'pointer',
                  }}
                >
                  {ins.year}年 Q{ins.quarter}
                </button>
              ))}
            </div>
          )}

          {/* Period label */}
          <p style={{ fontSize: 11, color: KAI.text4, marginBottom: 8 }}>
            {current.year}年 第{current.quarter}四半期 レポート
          </p>

          {/* Content */}
          <div style={{ overflow: 'hidden', maxHeight: expanded ? 'none' : 200, position: 'relative' }}>
            {renderMarkdown(current.content)}
            {!expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 60,
                background: 'linear-gradient(transparent,rgba(16,18,28,0.95))',
              }} />
            )}
          </div>

          <button
            onClick={() => setExpanded((p) => !p)}
            style={{
              marginTop: 10, fontSize: 12, fontWeight: 600,
              color: '#a78bfa', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0,
            }}
          >
            {expanded ? '閉じる ∧' : '続きを読む ∨'}
          </button>
        </>
      ) : null}
    </div>
  )
}
