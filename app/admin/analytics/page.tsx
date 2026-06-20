'use client'

import { useQuery } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { AiAnalyticsDashboard } from '@/components/admin/AiAnalyticsDashboard'

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin_analytics'],
    queryFn: () =>
      fetch('/api/admin/analytics').then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
        return j
      }),
    staleTime: 60_000,
    retry: false,
  })

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
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 96px' }}>

          {/* Error */}
          {isError && (
            <div style={{
              background: KAI.bgPanelSolid, border: '1px solid rgba(251,113,133,.25)',
              borderRadius: 16, padding: '28px 24px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: KAI.danger, fontWeight: 600, marginBottom: 8 }}>
                {error instanceof Error && error.message.includes('管理者')
                  ? '管理者権限が必要です'
                  : `読み込みに失敗しました — ${error instanceof Error ? error.message : 'Unknown error'}`}
              </p>
              {error instanceof Error && error.message.includes('管理者') && (
                <p style={{ fontSize: 12, color: KAI.text4, lineHeight: 1.6 }}>
                  Supabase で <code style={{
                    fontFamily: 'var(--font-jetbrains), monospace',
                    background: KAI.overlayWeak, padding: '1px 5px', borderRadius: 4,
                  }}>is_admin = true</code> に設定してください
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton variant="panel" className="h-48" />
              <Skeleton variant="panel" className="h-64" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Skeleton variant="panel" className="h-28" />
                <Skeleton variant="panel" className="h-28" />
              </div>
              <Skeleton variant="panel" className="h-48" />
            </div>
          )}

          {/* Dashboard */}
          {data && (
            <AiAnalyticsDashboard data={data} refetch={refetch} isFetching={isFetching} />
          )}
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
