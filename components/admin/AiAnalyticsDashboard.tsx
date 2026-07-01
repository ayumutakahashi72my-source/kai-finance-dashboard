'use client'

import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Sparkles } from 'lucide-react'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const MINT = '#5eead4'
const UP = '#4ade80'
const BLUE = '#7aa7ff'
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const CORAL = '#fb9477'
const AMBER = '#fbbf24'
const DOWN = '#fb7185'

interface AnalyticsData {
  summary: {
    total: number; cacheHits: number; hitRate: number
    totalApiCalls: number; avgLatency: number; p95Latency: number
    avgConfidence: number; avgSimilarity: number; sampleSize: number
  }
  methodBreakdown: Record<string, number>
  dailyStats: Array<{ day: string; total: number; hitRate: number; apiCalls: number; avgLatency: number }>
  lowConfidenceMisses: Array<{
    created_at: string; payee: string; payee_key: string
    category_name: string | null; method: string
    confidence: number | null; similarity: number | null; latency_ms: number | null
  }>
  failedRows: Array<{ created_at: string; payee: string; payee_key: string; latency_ms: number | null }>
  cost: {
    totalCostUsd: number; totalCostJpy: number
    byModel: Record<string, { calls: number; cost_usd: number }>
    byFeature: Record<string, number>
    dailyCosts: Array<{ day: string; cost_usd: number; cost_jpy: number }>
  }
  coverage: {
    golden: { total: number; covered: number; rate: number; misses: string[] }
    live: {
      regexRule: number; vector: number; llmFull: number; failed: number; correction: number
      regexRate: number; llmRate: number; failedRate: number
    }
  }
  payeeMissRanking: Array<{ payee: string; payee_key: string; count: number; last_seen: string }>
  categoryConfidence: Array<{ category_name: string; avg_confidence: number; count: number }>
  ragGrowthCurve: Array<{ week: string; total: number; exactCache: number; exactCacheRate: number }>
  healthSnapshots: Array<{
    date: string; cacheRate: number | null; llmRate: number | null
    failedRate: number | null; totalClassified: number; totalLearned: number; costUsd: number | null
  }>
  ragStats: {
    totalLearned: number; highConfidence: number
    hitCountDist: { once: number; twice: number; threeFour: number; fiveNine: number; tenPlus: number }
  }
}

/* ─── Pipeline tier config ─── */

const PIPELINE_TIERS = [
  { key: 'regex_rule',    label: '① キーワードルール',     tag: '無料', color: MINT },
  { key: 'exact_cache',   label: '② 完全一致キャッシュ',   tag: '無料', color: UP },
  { key: 'vector_direct', label: '③ ベクター検索 direct',  tag: '安価', color: BLUE },
  { key: 'vector_rerank', label: '④ ベクター rerank',      tag: '安価', color: CYAN },
  { key: 'llm',           label: '⑤ AI分類 Haiku',         tag: '有料', color: VIOLET },
] as const

/* ─── Donut SVG ─── */

function CacheRateDonut({ rate }: { rate: number }) {
  const r = 67
  const circ = 2 * Math.PI * r
  const offset = circ - circ * Math.min(rate, 1)
  return (
    <div style={{ position: 'relative', width: 158, height: 158, flexShrink: 0 }}>
      <svg width="158" height="158" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke={KAI.border} strokeWidth="14" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke="url(#donutGrad)" strokeWidth="14" strokeLinecap="round"
          transform="rotate(-90 80 80)"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={MINT} />
            <stop offset="1" stopColor={UP} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ ...MONO, fontSize: 34, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: MINT }}>
          {Math.round(rate * 100)}<span style={{ fontSize: 18 }}>%</span>
        </div>
        <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', marginTop: 4, ...MONO }}>
          CACHE RATE
        </div>
      </div>
    </div>
  )
}

/* ─── Stacked bar ─── */

function StackedBar({ segments }: { segments: { pct: number; color: string }[] }) {
  return (
    <div style={{ height: 11, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 1.5 }}>
      {segments.filter(s => s.pct > 0).map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color, transition: 'width .6s ease-out' }} />
      ))}
    </div>
  )
}

/* ─── Growth chart (pure SVG) ─── */

function GrowthChart({ data }: { data: { rate: number }[] }) {
  if (data.length < 2) return null
  const W = 320, H = 90, padY = 10
  const min = Math.min(...data.map(d => d.rate))
  const max = Math.max(...data.map(d => d.rate))
  const range = max - min || 0.1
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - padY - ((d.rate - min) / range) * (H - 2 * padY)
    return { x, y }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="90" preserveAspectRatio="none">
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MINT} stopOpacity="0.34" />
          <stop offset="1" stopColor={MINT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={H * 0.25} x2={W} y2={H * 0.25} stroke={KAI.border} strokeWidth="1" />
      <line x1="0" y1={H * 0.6} x2={W} y2={H * 0.6} stroke={KAI.border} strokeWidth="1" />
      <path d={area} fill="url(#growthFill)" />
      <path d={line} fill="none" stroke={MINT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x} cy={last.y} r="3.5" fill={MINT} />}
    </svg>
  )
}

/* ─── Panel ─── */

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

/* ─── Cost bar ─── */

function CostBar({ label, sublabel, amount, pct, color }: {
  label: string; sublabel: string; amount: string; pct: number; color: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
        <span style={{ color: KAI.text2 }}>{label} <span style={{ ...MONO, color: KAI.text4, fontSize: 10 }}>{sublabel}</span></span>
        <span style={{ ...MONO, color, fontWeight: 700 }}>{amount}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: KAI.overlayWeak, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, transition: 'width .5s ease-out' }} />
      </div>
    </div>
  )
}

/* ─── Main Dashboard ─── */

export function AiAnalyticsDashboard({ data }: {
  data: AnalyticsData; refetch?: () => void; isFetching?: boolean
}) {
  const { summary, methodBreakdown, cost, ragStats, ragGrowthCurve, lowConfidenceMisses, failedRows, coverage } = data

  // Compute pipeline percentages
  const total = summary.sampleSize || 1
  const llmCount = (methodBreakdown.llm_full ?? 0) + (methodBreakdown.llm_freeform ?? 0)
  const pipelinePcts = PIPELINE_TIERS.map(t => {
    if (t.key === 'llm') return { ...t, count: llmCount, pct: (llmCount / total) * 100 }
    const count = methodBreakdown[t.key] ?? 0
    return { ...t, count, pct: (count / total) * 100 }
  })
  const cacheRate = summary.hitRate
  const llmReduction = total > 0 ? ((total - llmCount) / total) : 0

  // Growth data
  const growthData = ragGrowthCurve.map(w => ({ rate: w.exactCacheRate }))
  const firstRate = ragGrowthCurve.length > 0 ? Math.round(ragGrowthCurve[0].exactCacheRate * 100) : 0
  const lastRate = ragGrowthCurve.length > 0 ? Math.round(ragGrowthCurve[ragGrowthCurve.length - 1].exactCacheRate * 100) : 0
  const growthDelta = lastRate - firstRate

  // Cost by model
  const costModels = Object.entries(cost.byModel).sort(([, a], [, b]) => b.cost_usd - a.cost_usd)
  const maxCostUsd = costModels.length > 0 ? costModels[0][1].cost_usd : 1

  // Health
  const healthScore = Math.round(
    (cacheRate >= 0.7 ? 25 : cacheRate * 25 / 0.7)
    + (summary.avgConfidence >= 0.85 ? 25 : summary.avgConfidence * 25 / 0.85)
    + (llmReduction >= 0.8 ? 25 : llmReduction * 25 / 0.8)
    + (failedRows.length === 0 ? 25 : Math.max(0, 25 - failedRows.length * 2))
  )
  const isHealthy = healthScore >= 80

  // AI insight mutation
  const { mutate: generateInsight, isPending: insightPending, data: insightData, error: insightError } = useMutation<
    { insight: string }, Error
  >({
    mutationFn: () =>
      fetch('/api/admin/analytics/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, methodBreakdown, cost, coverage }),
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '生成失敗')
        return j
      }),
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/settings" style={{
            width: 34, height: 34, borderRadius: 11,
            background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, textDecoration: 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.text2} strokeWidth="2.2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>AI運用分析</div>
            <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2 }}>分類パイプラインの効率とコスト</div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: isHealthy ? 'rgba(74,222,128,.10)' : 'rgba(251,191,36,.10)',
          border: `1px solid ${isHealthy ? 'rgba(74,222,128,.25)' : 'rgba(251,191,36,.25)'}`,
          borderRadius: 99, padding: '5px 10px', marginTop: 3,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isHealthy ? UP : AMBER }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: isHealthy ? UP : AMBER }}>
            {isHealthy ? '健全' : '要注意'}
          </span>
        </div>
      </div>

      {/* ── Hero: Cache Rate ── */}
      <Panel style={{
        padding: '20px 18px',
        background: 'linear-gradient(135deg, rgba(94,234,212,.07), rgba(20,22,32,.9))',
        borderColor: 'rgba(94,234,212,.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <CacheRateDonut rate={cacheRate} />
          {/* minWidth:0 が無いと固定幅158pxのドーナツの隣で、金額等が長い場合にこの列が
              自身の内容幅を確保しようとしてパネル外へはみ出す（flexアイテムの既定min-widthはauto） */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: MINT, textTransform: 'uppercase', ...MONO }}>
              キャッシュ率
            </div>
            <p style={{ fontSize: 11.5, color: KAI.text2, lineHeight: 1.6, margin: '8px 0 0' }}>
              ルール・完全一致・ベクター検索で<strong style={{ color: KAI.text1 }}>LLMを介さず</strong>自動分類できた割合。
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: KAI.text3 }}>LLM削減率</span>
                <span style={{ ...MONO, fontSize: 15, fontWeight: 800, color: UP }}>
                  ▲ {Math.round(llmReduction * 100)}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: KAI.text3 }}>今月コスト</span>
                <span style={{ ...MONO, fontSize: 15, fontWeight: 800, color: CORAL }}>
                  ¥{cost.totalCostJpy.toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Pipeline Breakdown ── */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
            分類メソッド内訳
          </span>
          <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO }}>
            直近 · {summary.sampleSize.toLocaleString()}件
          </span>
        </div>
        <StackedBar segments={pipelinePcts.map(t => ({ pct: t.pct, color: t.color }))} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: KAI.text4, ...MONO, margin: '6px 0 8px' }}>
          <span>無料・即時 ←</span>
          <span>→ 有料・LLM</span>
        </div>
        {pipelinePcts.map(t => (
          <div key={t.key} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0',
            borderTop: `1px solid ${KAI.border}`,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: t.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: KAI.text2 }}>{t.label}</span>
            <span style={{
              fontSize: 8.5, ...MONO, letterSpacing: '.04em', padding: '2px 6px', borderRadius: 5, fontWeight: 700,
              color: t.color, background: `${t.color}1e`,
            }}>{t.tag}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, ...MONO, width: 42, textAlign: 'right', color: t.color }}>
              {t.pct.toFixed(0)}%
            </span>
          </div>
        ))}
      </Panel>

      {/* ── Cache Growth Curve ── */}
      {ragGrowthCurve.length >= 2 && (
        <Panel style={{ padding: '15px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
              キャッシュ成長曲線（週次）
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: UP, ...MONO }}>
              {growthDelta >= 0 ? '+' : ''}{growthDelta}pt / {ragGrowthCurve.length}週
            </span>
          </div>
          <GrowthChart data={growthData} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: KAI.text4, ...MONO, marginTop: 4 }}>
            <span>{firstRate}%</span>
            <span>学習店舗が増えるほどキャッシュ率↑</span>
            <span style={{ color: MINT }}>{lastRate}%</span>
          </div>
        </Panel>
      )}

      {/* ── Two Small Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Panel style={{ padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
            分類精度
          </div>
          <div style={{ ...MONO, fontSize: 24, fontWeight: 800, color: UP, marginTop: 8, lineHeight: 1 }}>
            {summary.avgConfidence > 0 ? `${(summary.avgConfidence * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <div style={{ fontSize: 10, color: KAI.text4, marginTop: 6 }}>
            Golden Dataset {coverage.golden.total}件
          </div>
        </Panel>
        <Panel style={{ padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
            RAG学習店舗
          </div>
          <div style={{ ...MONO, fontSize: 24, fontWeight: 800, color: BLUE, marginTop: 8, lineHeight: 1 }}>
            {ragStats?.totalLearned?.toLocaleString() ?? '—'}
          </div>
          <div style={{ fontSize: 10, color: KAI.text4, marginTop: 6 }}>
            高信頼 {ragStats?.highConfidence ?? 0} · 平均conf {summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(2) : '—'}
          </div>
        </Panel>
      </div>

      {/* ── Cost Breakdown ── */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
            AIコスト内訳（モデル別）
          </span>
          <span style={{ ...MONO, fontSize: 13, fontWeight: 800, color: CORAL }}>
            ¥{cost.totalCostJpy.toLocaleString()} / 月
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {costModels.map(([model, v]) => {
            const jpy = Math.ceil(v.cost_usd * 150)
            const isHaiku = model.toLowerCase().includes('haiku')
            const isSonnet = model.toLowerCase().includes('sonnet')
            const color = isHaiku ? VIOLET : isSonnet ? BLUE : CYAN
            const sublabel = isHaiku ? '分類' : isSonnet ? 'サマリー・チャット' : 'ベクター'
            return (
              <CostBar
                key={model}
                label={isHaiku ? 'Haiku' : isSonnet ? 'Sonnet' : model}
                sublabel={sublabel}
                amount={`¥${jpy.toLocaleString()}`}
                pct={(v.cost_usd / maxCostUsd) * 100}
                color={color}
              />
            )
          })}
          {costModels.length === 0 && (
            <div style={{ fontSize: 12, color: KAI.text4, textAlign: 'center', padding: 16 }}>
              コストデータなし
            </div>
          )}
        </div>
      </Panel>

      {/* ── 要対応ログ ── */}
      {(lowConfidenceMisses.length > 0 || failedRows.length > 0) && (
        <Panel style={{ padding: '15px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: KAI.text3, textTransform: 'uppercase', ...MONO }}>
              要対応ログ — 低精度・分類失敗
            </span>
            <span style={{ fontSize: 11, color: AMBER, fontWeight: 700 }}>
              {lowConfidenceMisses.length + failedRows.length}件
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...lowConfidenceMisses.slice(0, 5), ...failedRows.slice(0, 3)].map((row, i) => {
              const isFailed = !('confidence' in row && (row as { confidence?: number | null }).confidence != null)
              const conf = 'confidence' in row ? (row as { confidence?: number | null }).confidence : null
              const catName = 'category_name' in row ? (row as { category_name?: string | null }).category_name : null
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px',
                  background: KAI.overlayWeak,
                  border: `1px solid ${KAI.border}`,
                  borderRadius: 10,
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: 2, flexShrink: 0,
                    background: isFailed ? DOWN : AMBER,
                  }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: KAI.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.payee}
                  </span>
                  {typeof conf === 'number' && (
                    <span style={{ ...MONO, fontSize: 11, color: KAI.text4 }}>conf {conf.toFixed(2)}</span>
                  )}
                  {typeof catName === 'string' && (
                    <span style={{ fontSize: 11, color: KAI.text3, width: 96, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {catName}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {lowConfidenceMisses.length === 0 && failedRows.length === 0 && summary.total > 0 && (
        <Panel style={{ padding: '16px 20px', borderColor: `${UP}28` }}>
          <p style={{ fontSize: 13, color: UP, textAlign: 'center', margin: 0 }}>
            ✓ 低精度・失敗ログなし — 分類品質は良好です
          </p>
        </Panel>
      )}

      {/* ── AI 改善提案 ── */}
      <Panel style={{
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(167,139,250,.10), rgba(20,22,32,.9))',
        borderColor: 'rgba(167,139,250,.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Sparkles size={15} style={{ color: VIOLET }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: VIOLET, textTransform: 'uppercase', ...MONO }}>
            AI改善提案 · Haiku生成
          </span>
        </div>

        {insightData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insightData.insight.split('\n').filter(l => l.trim()).map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span style={{ color: MINT, fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>
                  {i === 0 ? '①' : i === 1 ? '②' : '③'}
                </span>
                <p style={{ margin: 0, fontSize: 12, color: KAI.text2, lineHeight: 1.6 }}>
                  {line.replace(/^[-*✓⚠🔴]\s*/, '')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: KAI.text3, margin: 0 }}>
            ボタンを押すと、現在のデータに基づいた改善提案を自動生成します。
          </p>
        )}

        {insightError && (
          <p style={{ fontSize: 12, color: DOWN, marginTop: 8 }}>{insightError.message}</p>
        )}

        <button
          onClick={() => generateInsight()}
          disabled={insightPending || summary.total === 0}
          style={{
            marginTop: 14, width: '100%', padding: 10,
            background: 'rgba(167,139,250,.16)',
            border: '1px solid rgba(167,139,250,.32)',
            borderRadius: 11, color: VIOLET,
            fontSize: 12.5, fontWeight: 700,
            cursor: insightPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            opacity: insightPending ? 0.6 : 1,
          }}
        >
          {insightPending ? '分析中…' : insightData ? '再分析する' : '提案を生成する →'}
        </button>
      </Panel>

      {/* ── Empty state ── */}
      {summary.total === 0 && (
        <Panel style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: KAI.text3, fontWeight: 600, marginBottom: 8 }}>
            分類ログがまだありません
          </p>
          <p style={{ fontSize: 12, color: KAI.text4, lineHeight: 1.7 }}>
            CSV取り込みまたはMF自動取得を実行すると、ここに分析データが表示されます
          </p>
        </Panel>
      )}
    </div>
  )
}
