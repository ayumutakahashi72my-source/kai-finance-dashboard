'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { renderMarkdown } from '@/lib/markdown'
import { KAI } from '@/lib/kai-tokens'

interface SummaryData {
  year: number
  month: number
  content: string
  created_at: string
}

interface MonthEntry {
  year: number
  month: number
  created_at: string
}

function LiveDot() {
  return (
    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 99, background: KAI.violet, animation: 'kai-pulse-mint 2.4s ease-in-out infinite', boxShadow: `0 0 6px ${KAI.violet}` }} />
  )
}

export function SummaryContent() {
  const qc = useQueryClient()

  // 存在する月一覧
  const { data: listData } = useQuery<{ data: MonthEntry[] }>({
    queryKey: ['ai_summary_list'],
    queryFn: async () => { const r = await fetch('/api/ai/summary?list=true'); if (!r.ok) throw new Error('取得に失敗しました'); return r.json() },
  })
  const months = listData?.data ?? []

  // 選択中の月（デフォルト: 最新）
  const [selected, setSelected] = useState<{ year: number; month: number } | null>(null)
  const target = selected ?? (months.length > 0 ? { year: months[0].year, month: months[0].month } : null)

  // 選択月のサマリー取得
  const { data, isLoading } = useQuery<{ data: SummaryData | null }>({
    queryKey: ['ai_summary', target?.year, target?.month],
    queryFn: async () => {
      const url = target ? `/api/ai/summary?year=${target.year}&month=${target.month}` : '/api/ai/summary'
      const r = await fetch(url)
      if (!r.ok) throw new Error('取得に失敗しました')
      return r.json()
    },
    enabled: true,
  })

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      fetch('/api/ai/summary', { method: 'POST' }).then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? '生成失敗')
        return json
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai_summary'] })
      qc.invalidateQueries({ queryKey: ['ai_summary_list'] })
    },
  })

  const summary = data?.data

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton variant="line-lg" className="h-7 w-48" />
        <div className="space-y-2.5">
          <Skeleton variant="line-md" />
          <Skeleton variant="line-md" />
          <Skeleton variant="line-sm" className="w-4/5" />
        </div>
        <div className="space-y-2.5 pt-4">
          <Skeleton variant="line-md" />
          <Skeleton variant="line-md" />
        </div>
      </div>
    )
  }

  return (
    <div className="reveal-up space-y-4">
      {/* Month selector */}
      {months.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {months.map((m) => {
            const isActive = target?.year === m.year && target?.month === m.month
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => setSelected({ year: m.year, month: m.month })}
                className="mono rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition-all"
                style={{
                  background: isActive ? 'rgba(167,139,250,0.18)' : KAI.overlayWeak,
                  border: isActive ? '1px solid rgba(167,139,250,0.55)' : `1px solid ${KAI.overlayBorder}`,
                  color: isActive ? KAI.violet : KAI.text3,
                }}
              >
                {m.year}.{String(m.month).padStart(2, '0')}
              </button>
            )
          })}
        </div>
      )}

      {!summary ? (
        <div
          className="flex flex-col items-center gap-4 rounded-[18px] py-14 text-center"
          style={{ background: KAI.bgPanel, border: `1px solid ${KAI.overlayBorder}` }}
        >
          <div
            className="mono flex h-12 w-12 items-center justify-center rounded-[14px] text-[16px] font-black"
            style={{ background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, color: KAI.bg }}
          >
            AI
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: KAI.text2 }}>今月のサマリーがありません</p>
            <p className="mt-1 text-[13px]" style={{ color: KAI.text4 }}>「生成する」を押して今月の家計レポートを作成します</p>
          </div>
          <button
            onClick={() => mutate()}
            disabled={isPending}
            className="rounded-[12px] px-6 py-3 text-[14px] font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, boxShadow: '0 4px 20px rgba(167,139,250,0.35)', color: KAI.bg }}
          >
            {isPending ? '生成中…' : '今月分を生成する'}
          </button>
          {error && <p className="text-xs" style={{ color: KAI.danger }}>{(error as Error).message}</p>}
        </div>
      ) : (
        <>
          {/* Meta header */}
          <div
            className="flex items-center justify-between rounded-[14px] px-4 py-3"
            style={{
              background: 'linear-gradient(135deg,rgba(167,139,250,0.10),rgba(20,22,32,0.66))',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(167,139,250,0.22)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="mono flex h-7 w-7 items-center justify-center rounded-[8px] text-[11px] font-black"
                style={{ background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, color: KAI.bg }}
              >
                AI
              </span>
              <div>
                <p className="mono text-[11px] font-bold tracking-[.10em]" style={{ color: KAI.violet }}>
                  {summary.year}.{String(summary.month).padStart(2, '0')} SUMMARY
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <LiveDot />
                  <span className="text-[11px]" style={{ color: KAI.text3 }}>Sonnet 生成</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => mutate()}
              disabled={isPending}
              className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:opacity-40"
              style={{ border: '1px solid rgba(167,139,250,0.25)', minHeight: 32, color: KAI.violet }}
            >
              {isPending ? '生成中…' : '再生成'}
            </button>
          </div>

          {/* Content */}
          <div
            className="rounded-[18px] px-6 py-6"
            style={{
              background: KAI.bgPanel,
              backdropFilter: 'blur(24px) saturate(160%)',
              border: `1px solid ${KAI.overlayBorder}`,
            }}
          >
            {renderMarkdown(summary.content)}
          </div>

          {error && <p className="mt-3 text-xs" style={{ color: KAI.danger }}>{(error as Error).message}</p>}
        </>
      )}
    </div>
  )
}
