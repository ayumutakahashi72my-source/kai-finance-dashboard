'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'

interface SummaryData {
  year: number
  month: number
  content: string
  created_at: string
}

function LiveDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: 99,
        background: '#fb9477',
        animation: 'kai-pulse-coral 2.4s ease-in-out infinite',
        boxShadow: '0 0 6px #fb9477',
      }}
    />
  )
}

/** 本文の最初の段落（見出し・空行を除いた最初の文章）を返す */
function extractFirstParagraph(content: string): string {
  const lines = content.split('\n')
  for (const line of lines) {
    const stripped = line.replace(/^#{1,3}\s+/, '').replace(/\*\*/g, '').trim()
    if (stripped.length > 20) {
      return stripped.length > 120 ? stripped.slice(0, 120) + '…' : stripped
    }
  }
  return content.slice(0, 120)
}

export function AiSummaryCard() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ data: SummaryData | null }>({
    queryKey: ['ai_summary'],
    queryFn: async () => {
      const r = await fetch('/api/ai/summary')
      if (!r.ok) throw new Error('サマリーの読み込みに失敗しました')
      return r.json()
    },
  })

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      fetch('/api/ai/summary', { method: 'POST' }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? '生成失敗')
        return json
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai_summary'] }),
  })

  const summary = data?.data

  return (
    <div
      className="reveal-up rounded-[18px] p-4"
      style={{
        background: `linear-gradient(135deg,rgba(251,148,119,0.10),rgba(122,167,255,0.06),${KAI.bgPanel})`,
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(251,148,119,0.18)',
        animationDelay: '140ms',
      }}
    >
      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-[7px]"
          style={{ background: 'linear-gradient(135deg,#fb9477,#f5d4b8)', flexShrink: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1L7.2 4.8H11L8 7.2L9.2 11L6 8.8L2.8 11L4 7.2L1 4.8H4.8L6 1Z" fill="rgba(10,10,16,0.85)" />
          </svg>
        </span>
        <span className="text-[13px] font-bold text-[#fb9477]">今日のひとこと</span>
        <LiveDot />
      </div>

      {/* Body — compact */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton variant="line-md" />
          <Skeleton variant="line-sm" className="w-3/4" />
        </div>
      ) : summary ? (
        <p className="text-[14px] leading-[1.75]" style={{ color: KAI.text2 }}>
          {extractFirstParagraph(summary.content)}
        </p>
      ) : (
        <p className="text-[13px]" style={{ color: KAI.text4 }}>
          今月のサマリーはまだ生成されていません
        </p>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-[#fb7185]">{(error as Error).message}</p>
      )}

      {/* Footer actions */}
      <div className="mt-3 flex items-center justify-between">
        {summary ? (
          <Link
            href="/summary?tab=1"
            className="text-[13px] font-semibold text-[#fb9477] transition-colors hover:text-[#c4b5fd]"
          >
            全文を見る <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M5 2.5L9 6L5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        ) : (
          <span />
        )}
        <button
          onClick={() => mutate()}
          disabled={isPending || isLoading}
          className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-[#fb9477] transition-colors hover:bg-[#a78bfa]/10 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ border: '1px solid rgba(251,148,119,0.25)', minHeight: 32 }}
        >
          {isPending ? '生成中…' : summary ? '再生成' : '今月分を生成'}
        </button>
      </div>
    </div>
  )
}
