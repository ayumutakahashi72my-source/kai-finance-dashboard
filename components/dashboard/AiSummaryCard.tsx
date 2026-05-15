'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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
        background: '#5eead4',
        animation: 'pulseDot 1.8s infinite',
        boxShadow: '0 0 6px #5eead4',
      }}
    />
  )
}

export function AiSummaryCard() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ data: SummaryData | null }>({
    queryKey: ['ai_summary'],
    queryFn: () => fetch('/api/ai/summary').then((r) => r.json()),
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
        background: 'linear-gradient(135deg,rgba(167,139,250,0.10),rgba(20,22,32,0.66))',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(167,139,250,0.18)',
        animationDelay: '140ms',
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="mono flex h-6 w-6 items-center justify-center rounded-[7px] text-[11px] font-black text-[#0a0a10]"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#5eead4)' }}
        >
          AI
        </span>
        <span className="text-[13px] font-bold text-[#a78bfa]">今月のサマリー</span>
        <LiveDot />
        <div className="ml-auto">
          <button
            onClick={() => mutate()}
            disabled={isPending || isLoading}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/10 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ minHeight: 32, border: '1px solid rgba(167,139,250,0.25)' }}
          >
            {isPending ? '生成中…' : summary ? '⟲ 再生成' : '今月分を生成'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-12 animate-pulse rounded-lg bg-white/5" />
      ) : summary ? (
        <>
          <p className="text-[14px] leading-[1.75] text-[#c4c4d0]">{summary.content}</p>
          <p className="mt-2 text-right text-[11px] text-[#5e5e72]">
            {summary.year}年{summary.month}月 生成
          </p>
        </>
      ) : (
        <p className="py-4 text-center text-sm text-[#5e5e72]">
          今月のサマリーはまだ生成されていません
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-[#fb7185]">{(error as Error).message}</p>
      )}
    </div>
  )
}
