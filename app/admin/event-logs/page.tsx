'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'

interface EventLog {
  id: string
  level: string
  category: string
  message: string
  metadata: Record<string, unknown> | null
  url: string | null
  user_agent: string | null
  user_name: string | null
  created_at: string
}

interface Counts {
  error: number
  warn: number
  info: number
  total: number
}

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  error: { bg: 'rgba(251,113,133,0.10)', text: '#fb7185', border: 'rgba(251,113,133,0.30)' },
  warn:  { bg: 'rgba(251,191,36,0.10)',  text: '#fbbf24', border: 'rgba(251,191,36,0.30)' },
  info:  { bg: 'rgba(94,234,212,0.10)',  text: '#5eead4', border: 'rgba(94,234,212,0.30)' },
}

export default function EventLogsPage() {
  const [level, setLevel] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const limit = 50

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin_event_logs', level, page],
    queryFn: () => {
      const params = new URLSearchParams()
      if (level) params.set('level', level)
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      return fetch(`/api/admin/event-logs?${params}`).then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
        return j as { logs: EventLog[]; total: number; counts: Counts }
      })
    },
    staleTime: 10_000,
    retry: false,
  })

  const counts = data?.counts
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div style={{ minHeight: '100vh', background: KAI.bg, color: KAI.text1 }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{
        zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 700px 500px at 18% -4%, rgba(167,139,250,.07), transparent 60%),
          radial-gradient(ellipse 600px 460px at 92% 2%, rgba(94,234,212,.05), transparent 60%)`,
      }} />
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{
        zIndex: 1,
        backgroundImage: `linear-gradient(${KAI.gridLine} 1px,transparent 1px),linear-gradient(90deg,${KAI.gridLine} 1px,transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      <Sidebar />

      <div className="relative lg:pl-[220px]" style={{ zIndex: 2 }}>
        <main style={{ maxWidth: 800, margin: '0 auto', padding: '20px 16px 96px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Link
              href="/settings"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 10,
                background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
                textDecoration: 'none', color: KAI.text2, flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </Link>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>イベントログ</h1>
          </div>

          {isError && (
            <div style={{
              background: KAI.bgPanelSolid, border: '1px solid rgba(251,113,133,.25)',
              borderRadius: 16, padding: '28px 24px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: KAI.danger, fontWeight: 600 }}>
                {error instanceof Error && error.message.includes('管理者')
                  ? '管理者権限が必要です'
                  : `読み込みに失敗しました`}
              </p>
            </div>
          )}

          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton variant="panel" className="h-16" />
              <Skeleton variant="panel" className="h-64" />
            </div>
          )}

          {counts && (
            <>
              {/* Level filter chips */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <FilterChip label={`全て (${counts.total})`} active={level === null} onClick={() => { setLevel(null); setPage(0) }} />
                <FilterChip label={`Error (${counts.error})`} active={level === 'error'} color="#fb7185" onClick={() => { setLevel('error'); setPage(0) }} />
                <FilterChip label={`Warn (${counts.warn})`} active={level === 'warn'} color="#fbbf24" onClick={() => { setLevel('warn'); setPage(0) }} />
                <FilterChip label={`Info (${counts.info})`} active={level === 'info'} color="#5eead4" onClick={() => { setLevel('info'); setPage(0) }} />
              </div>

              {/* Log entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.logs.length === 0 && (
                  <div style={{
                    background: KAI.bgPanelSolid, borderRadius: 16, padding: '40px 24px',
                    textAlign: 'center', border: `1px solid ${KAI.border}`,
                  }}>
                    <p style={{ fontSize: 13, color: KAI.text3 }}>ログがありません</p>
                  </div>
                )}
                {data.logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <PagButton label="← 前" disabled={page === 0} onClick={() => setPage(page - 1)} />
                  <span style={{ fontSize: 13, color: KAI.text3, padding: '8px 12px' }}>
                    {page + 1} / {totalPages}
                  </span>
                  <PagButton label="次 →" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <BottomBar />
    </div>
  )
}

function FilterChip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        border: active ? `1px solid ${color ?? KAI.violet}` : `1px solid ${KAI.border}`,
        background: active ? `${color ?? KAI.violet}20` : 'transparent',
        color: active ? (color ?? KAI.violet) : KAI.text3,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function PagButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        border: `1px solid ${KAI.border}`,
        background: disabled ? 'transparent' : KAI.overlayWeak,
        color: disabled ? KAI.text5 : KAI.text2,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  )
}

function LogEntry({ log }: { log: EventLog }) {
  const [expanded, setExpanded] = useState(false)
  const lc = LEVEL_COLORS[log.level] ?? LEVEL_COLORS.info
  const time = new Date(log.created_at)
  const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: KAI.bgPanelSolid,
        border: `1px solid ${KAI.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        borderLeft: `3px solid ${lc.text}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          background: lc.bg,
          color: lc.text,
          border: `1px solid ${lc.border}`,
          textTransform: 'uppercase',
          fontFamily: 'var(--font-jetbrains), monospace',
        }}>
          {log.level}
        </span>
        <span style={{
          fontSize: 11,
          color: KAI.text3,
          fontFamily: 'var(--font-jetbrains), monospace',
        }}>
          {log.category}
        </span>
        {log.user_name && (
          <span style={{
            fontSize: 10,
            color: KAI.text4,
            background: KAI.overlayWeak,
            padding: '1px 6px',
            borderRadius: 4,
          }}>
            {log.user_name}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: 11,
          color: KAI.text4,
          fontFamily: 'var(--font-jetbrains), monospace',
        }}>
          {timeStr}
        </span>
      </div>
      {log.url && !expanded && (
        <span style={{
          fontSize: 10,
          color: KAI.text5,
          fontFamily: 'var(--font-jetbrains), monospace',
          marginBottom: 2,
          display: 'block',
        }}>
          {(() => { try { return new URL(log.url).pathname } catch { return log.url } })()}
        </span>
      )}
      <p style={{
        fontSize: 13,
        color: KAI.text2,
        margin: 0,
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}>
        {log.message.length > 200 && !expanded ? log.message.slice(0, 200) + '…' : log.message}
      </p>

      {expanded && (
        <div style={{ marginTop: 10, fontSize: 11, color: KAI.text4, lineHeight: 1.6 }}>
          {log.url && (
            <p style={{ margin: '2px 0' }}>
              <strong style={{ color: KAI.text3 }}>URL:</strong> {log.url}
            </p>
          )}
          {log.user_agent && (
            <p style={{ margin: '2px 0', wordBreak: 'break-all' }}>
              <strong style={{ color: KAI.text3 }}>UA:</strong> {log.user_agent}
            </p>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <pre style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(0,0,0,0.3)',
              overflow: 'auto',
              maxHeight: 300,
              fontSize: 11,
              fontFamily: 'var(--font-jetbrains), monospace',
              color: KAI.text3,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
