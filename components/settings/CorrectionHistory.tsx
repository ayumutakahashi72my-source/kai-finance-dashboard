'use client'

import { Bot, Lightbulb } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'

interface CorrectionEntry {
  id: string
  payee_key: string
  old_category: string | null
  new_category: string | null
  rag_promoted: boolean
  rag_promoted_at: string | null
  corrected_at: string
  use_count: number
  promotion_eligible: boolean
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

function StatusBadge({ entry }: { entry: CorrectionEntry }) {
  if (entry.rag_promoted) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
        background: `${KAI.green}18`, border: `1px solid ${KAI.green}30`,
        color: KAI.green, whiteSpace: 'nowrap',
      }}>
        ✓ AI学習済み
      </span>
    )
  }
  if (entry.promotion_eligible) {
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
        background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}30`,
        color: KAI.violet, whiteSpace: 'nowrap',
      }}>
        月次更新待ち
      </span>
    )
  }
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
      background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)',
      color: KAI.text4, whiteSpace: 'nowrap',
    }}>
      {entry.use_count < 3 ? `あと${3 - entry.use_count}回で学習` : '学習待ち'}
    </span>
  )
}

export function CorrectionHistory() {
  const { data, isLoading, isError } = useQuery<{ data: CorrectionEntry[] }>({
    queryKey: ['correction_history'],
    queryFn: () => fetch('/api/feedback').then((r) => r.json()),
    staleTime: 30_000,
  })

  if (isLoading) return (
    <div style={{ animation: 'kai-rise .5s .1s ease-out both' }}>
      <Skeleton variant="panel" className="h-48" />
    </div>
  )

  if (isError) return (
    <p style={{ fontSize: 11, color: KAI.danger }}>修正履歴の取得に失敗しました</p>
  )

  const entries = data?.data ?? []

  if (entries.length === 0) return (
    <div style={{
      background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
      borderRadius: 14, padding: '32px 16px', textAlign: 'center',
      animation: 'kai-rise .5s ease-out both',
    }}>
      <Bot size={28} strokeWidth={1.5} style={{ color: KAI.text3, marginBottom: 8 }}/>
      <p style={{ fontSize: 13, color: KAI.text3 }}>まだ修正履歴がありません</p>
      <p style={{ fontSize: 11, color: KAI.text4, marginTop: 6, lineHeight: 1.6 }}>
        取引のカテゴリを修正するとAIが学習します。<br />
        同じ支払先を3回修正するとAIに自動反映されます。
      </p>
    </div>
  )

  const promotedCount = entries.filter((e) => e.rag_promoted).length
  const eligibleCount = entries.filter((e) => e.promotion_eligible && !e.rag_promoted).length

  return (
    <section style={{ animation: 'kai-rise .5s ease-out both' }}>
      {/* サマリーバー */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          flex: 1, minWidth: 120,
          background: `${KAI.green}0a`, border: `1px solid ${KAI.green}20`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>AI学習済み</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: KAI.green, ...MONO, marginTop: 4 }}>{promotedCount}</p>
        </div>
        <div style={{
          flex: 1, minWidth: 120,
          background: `${KAI.violet}0a`, border: `1px solid ${KAI.violet}20`,
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>学習待ち</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: KAI.violet, ...MONO, marginTop: 4 }}>{eligibleCount}</p>
        </div>
        <div style={{
          flex: 1, minWidth: 120,
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <p style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>累計修正数</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: KAI.text1, ...MONO, marginTop: 4 }}>{entries.length}</p>
        </div>
      </div>

      {/* 説明 */}
      <div style={{
        padding: '10px 14px', marginBottom: 10,
        background: `${KAI.violet}08`, border: `1px solid ${KAI.violet}15`,
        borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Lightbulb size={14} strokeWidth={2} style={{ color: KAI.text3, flexShrink: 0 }}/>
        <p style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.6 }}>
          同じ支払先を<strong style={{ color: KAI.text2 }}>3回修正</strong>すると翌月初にAIへ反映されます（「AI学習済み」に変わります）。修正は次回の自動分類に優先的に使用されます。
        </p>
      </div>

      {/* 履歴リスト */}
      <div style={{
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 180px 110px 90px',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          {['支払先', 'カテゴリ変更', '修正日', 'ステータス'].map((h) => (
            <span key={h} style={{
              fontSize: 10, color: KAI.text4, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.08em',
            }}>{h}</span>
          ))}
        </div>

        {entries.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 180px 110px 90px',
              padding: '10px 16px', alignItems: 'center',
              borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
              opacity: entry.rag_promoted ? 0.75 : 1,
            }}
          >
            <span style={{
              fontSize: 12, color: KAI.text2, ...MONO,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {entry.payee_key}
            </span>

            <span style={{ fontSize: 11, color: KAI.text3, display: 'flex', alignItems: 'center', gap: 6 }}>
              {entry.old_category ? (
                <>
                  <span style={{ color: KAI.text4 }}>{entry.old_category}</span>
                  <span style={{ color: KAI.text4 }}>→</span>
                </>
              ) : null}
              <span style={{ color: KAI.violet, fontWeight: 600 }}>{entry.new_category}</span>
            </span>

            <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>
              {new Date(entry.corrected_at).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })}
            </span>

            <StatusBadge entry={entry} />
          </div>
        ))}
      </div>
    </section>
  )
}
