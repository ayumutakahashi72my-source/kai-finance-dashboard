'use client'

import { useEffect, useState } from 'react'
import { RefreshCwIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react'

interface MfLoginStep {
  step: string
  url: string
  status: number
  note: string
}

interface SyncLog {
  id: string
  triggered_by: 'manual' | 'cron'
  status: 'success' | 'error'
  step: string | null
  inserted: number
  skipped: number
  year: number | null
  month: number | null
  error_msg: string | null
  steps_detail: MfLoginStep[] | null
  created_at: string
}

const STEP_LABELS: Record<string, string> = {
  login: 'ログイン',
  fetch_transactions: '取引取得',
  db_upsert: 'DB保存',
  completed: '完了',
}

function LogDetail({ steps }: { steps: MfLoginStep[] }) {
  return (
    <ol className="mt-2 space-y-1 rounded-lg border border-white/5 bg-[#0a0a10] px-3 py-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px]">
          <span className={`mt-0.5 shrink-0 rounded px-1 font-mono ${
            s.status === 0 ? 'bg-white/5 text-[#5e5e72]' :
            s.status < 300 ? 'bg-[#4ade80]/10 text-[#4ade80]' :
            s.status < 400 ? 'bg-[#fbbf24]/10 text-[#fbbf24]' :
            'bg-[#fb7185]/10 text-[#fb7185]'
          }`}>
            {s.status === 0 ? '---' : s.status}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[#fb9477]">{s.step}</span>
            <span className="ml-2 break-all text-[#5e5e72]">
              {s.url.replace('https://', '')}
            </span>
            <p className="mt-0.5 break-all text-[#8b8ba0]">{s.note}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function MfSyncLogs() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    const res = await fetch('/api/settings/mf/logs')
    const data = await res.json() as { logs: SyncLog[] }
    setLogs(data.logs ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return <p className="py-4 text-center text-xs text-[#5e5e72]">読み込み中…</p>
  }

  if (!logs.length) {
    return <p className="py-4 text-center text-xs text-[#5e5e72]">ログがありません</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#8b8ba0]">直近20件</p>
        <button
          onClick={load}
          className="flex items-center gap-1 text-xs text-[#5e5e72] hover:text-[#f0f0f5] transition-colors"
        >
          <RefreshCwIcon className="size-3" />
          更新
        </button>
      </div>

      <ul className="divide-y divide-white/5">
        {logs.map((log) => {
          const date = new Date(log.created_at)
          const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
          const stepLabel = log.step ? (STEP_LABELS[log.step] ?? log.step) : ''
          const target = log.year && log.month ? `${log.year}年${log.month}月` : ''
          const hasDetail = (log.steps_detail?.length ?? 0) > 0
          const isExpanded = expanded.has(log.id)

          return (
            <li key={log.id} className="py-2.5">
              <div className="flex items-start gap-3">
                {/* ステータスバッジ */}
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    log.status === 'success'
                      ? 'bg-[#4ade80]/10 text-[#4ade80]'
                      : 'bg-[#fb7185]/10 text-[#fb7185]'
                  }`}
                >
                  {log.status === 'success' ? '成功' : 'エラー'}
                </span>

                <div className="min-w-0 flex-1">
                  {/* 1行目 */}
                  <p className="text-xs text-[#f0f0f5]">
                    {dateStr}
                    <span className="ml-2 text-[#5e5e72]">
                      {log.triggered_by === 'manual' ? '手動' : '自動（Cron）'}
                    </span>
                    {target && <span className="ml-2 text-[#8b8ba0]">{target}</span>}
                  </p>

                  {/* 2行目 */}
                  {log.status === 'success' ? (
                    <p className="mt-0.5 text-xs text-[#8b8ba0]">
                      追加 {log.inserted}件 · スキップ {log.skipped}件
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-[#fb7185]/80">
                      {stepLabel && <span className="mr-1 font-medium">[{stepLabel}]</span>}
                      {log.error_msg}
                    </p>
                  )}

                  {/* 詳細トグル */}
                  {hasDetail && (
                    <button
                      onClick={() => toggle(log.id)}
                      className="mt-1.5 flex items-center gap-1 text-[11px] text-[#5e5e72] hover:text-[#8b8ba0] transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDownIcon className="size-3" />
                        : <ChevronRightIcon className="size-3" />}
                      ステップ詳細 ({log.steps_detail!.length}件)
                    </button>
                  )}

                  {isExpanded && log.steps_detail && (
                    <LogDetail steps={log.steps_detail} />
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
