'use client'

import { useState } from 'react'
import { KAI } from '@/lib/kai-tokens'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const MINT = '#5eead4'
const UP = '#4ade80'
const BLUE = '#7aa7ff'
const AMBER = '#fbbf24'
const VIOLET = '#a78bfa'

export interface RagKeysData {
  totalKeys: number
  canonicalGroups: number
  duplicateKeys: number
  duplicationRate: number
  aggregationRate: number
  topClusters: Array<{
    canonical_key: string
    key_count: number
    total_hits: number
    has_canonical_row: boolean
  }>
  topMerchants: Array<{
    payee_key: string
    canonical_key: string | null
    category_name: string | null
    hit_count: number
    confidence: number | null
    last_seen: string | null
  }>
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: KAI.bgPanel, border: `1px solid ${KAI.border2}`,
      borderRadius: 16, ...style,
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
      {children}
    </span>
  )
}

/**
 * RAG学習キーの運用監視パネル。
 * ① canonical集約監視 — 正規化キーの重複率・集約率・肥大クラスタ
 * ② Top merchant × hit_count — キャッシュに最も貢献している店舗
 */
export function RagMerchantPanel({ data }: { data: RagKeysData }) {
  const [showAll, setShowAll] = useState(false)
  if (!data || data.totalKeys === 0) return null

  const merchants = showAll ? data.topMerchants : data.topMerchants.slice(0, 15)
  const maxHits = data.topMerchants[0]?.hit_count || 1

  return (
    <>
      {/* ── canonical 集約監視 ── */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel>正規化キー集約状況（canonical監視）</SectionLabel>
          <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO }}>
            学習キー {data.totalKeys.toLocaleString()}件
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'canonical群', value: data.canonicalGroups.toLocaleString(), color: BLUE },
            { label: '重複キー', value: data.duplicateKeys.toLocaleString(), color: data.duplicationRate > 0.3 ? AMBER : KAI.text2 },
            { label: '集約率', value: `${Math.round(data.aggregationRate * 100)}%`, color: data.aggregationRate >= 0.7 ? UP : AMBER },
          ].map((s) => (
            <div key={s.label} style={{
              background: KAI.overlayWeak, border: `1px solid ${KAI.border}`,
              borderRadius: 10, padding: '9px 10px',
            }}>
              <div style={{ fontSize: 9, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em' }}>{s.label}</div>
              <div style={{ ...MONO, fontSize: 17, fontWeight: 800, color: s.color, marginTop: 3, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {data.topClusters.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: KAI.text4, marginBottom: 8 }}>
              同一チェーンに複数キーが学習されているクラスタ（キー数順）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.topClusters.map((c) => (
                <div key={c.canonical_key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 11px', background: KAI.overlayWeak,
                  border: `1px solid ${KAI.border}`, borderRadius: 9,
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: KAI.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.canonical_key}
                  </span>
                  <span style={{ ...MONO, fontSize: 10.5, color: AMBER, fontWeight: 700 }}>
                    {c.key_count}キー
                  </span>
                  <span style={{ ...MONO, fontSize: 10.5, color: KAI.text4, width: 64, textAlign: 'right' }}>
                    hits {c.total_hits.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {data.topClusters.length === 0 && (
          <p style={{ fontSize: 12, color: UP, textAlign: 'center', margin: '4px 0 0' }}>
            ✓ キーの重複クラスタなし — 集約は良好です
          </p>
        )}
      </Panel>

      {/* ── Top merchant × hit_count ── */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionLabel>Top Merchant × hit_count</SectionLabel>
          <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO }}>
            上位{data.topMerchants.length}件
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {merchants.map((m, i) => (
            <div key={m.payee_key} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px',
              background: KAI.overlayWeak, border: `1px solid ${KAI.border}`, borderRadius: 9,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* hit_count に比例した背景バー */}
              <div aria-hidden style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.max(2, (m.hit_count / maxHits) * 100)}%`,
                background: `${MINT}0d`, pointerEvents: 'none',
              }} />
              <span style={{ ...MONO, fontSize: 10, color: KAI.text4, width: 22, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: KAI.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.payee_key}
                {m.canonical_key && (
                  <span style={{ fontSize: 9.5, color: VIOLET, marginLeft: 6 }}>→ {m.canonical_key}</span>
                )}
              </span>
              {m.category_name && (
                <span style={{ fontSize: 10.5, color: KAI.text3, maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.category_name}
                </span>
              )}
              {m.confidence != null && (
                <span style={{ ...MONO, fontSize: 10, color: m.confidence >= 0.8 ? UP : AMBER, width: 32, textAlign: 'right' }}>
                  {m.confidence.toFixed(2)}
                </span>
              )}
              <span style={{ ...MONO, fontSize: 12, fontWeight: 800, color: MINT, width: 44, textAlign: 'right' }}>
                {m.hit_count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {data.topMerchants.length > 15 && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              marginTop: 10, width: '100%', padding: 8,
              background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`,
              borderRadius: 10, color: KAI.text3, fontSize: 11.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {showAll ? '閉じる' : `全${data.topMerchants.length}件を表示 →`}
          </button>
        )}
      </Panel>
    </>
  )
}
