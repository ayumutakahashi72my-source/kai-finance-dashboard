'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { KAI } from '@/lib/kai-tokens'
import { Skeleton } from '@/components/ui/Skeleton'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }

const CacheGrowthChart = dynamic(() => import('./_CacheGrowthChart').then(m => m.CacheGrowthChart), {
  ssr: false,
  loading: () => <div style={{ height: 120 }} />,
})

// ── Types ─────────────────────────────────────────────────────────

interface AnalyticsData {
  summary: { total: number; cacheHits: number; hitRate: number; totalApiCalls: number; avgLatency: number; p95Latency: number; avgConfidence: number; avgSimilarity: number; sampleSize: number }
  methodBreakdown: Record<string, number>
  dailyStats: Array<{ day: string; total: number; hitRate: number; apiCalls: number; avgLatency: number }>
  lowConfidenceMisses: Array<{ payee: string; category_name: string | null; method: string; confidence: number | null; similarity: number | null }>
  failedRows: Array<{ payee: string; payee_key: string; latency_ms: number }>
  ragGrowthCurve: Array<{ week: string; total: number; exactCache: number; exactCacheRate: number }>
  ragStats: { totalLearned: number; highConfidence: number; hitCountDist: Record<string, number> }
  cost: { totalCostUsd: number; totalCostJpy: number; byModel: Record<string, { calls: number; cost_usd: number }>; byFeature: Record<string, number>; dailyCosts: Array<{ day: string; cost_usd: number; cost_jpy: number }> }
  coverage: { golden: { total: number; covered: number; rate: number }; live: { regexRule: number; vector: number; llmFull: number; failed: number; correction: number; regexRate: number; llmRate: number; failedRate: number } }
}

// ── 5-layer mapping ──────────────────────────────────────────────

interface Layer { label: string; color: string; tag: string; tagColor: string; count: number }

function computeLayers(mb: Record<string, number>): { layers: Layer[]; total: number } {
  const total = Object.values(mb).reduce((s, v) => s + v, 0) || 1
  const layers: Layer[] = [
    { label: '① キーワードルール',   color: KAI.mint,    tag: '無料', tagColor: KAI.mint,    count: mb['regex_rule'] ?? 0 },
    { label: '② 完全一致キャッシュ', color: KAI.success, tag: '無料', tagColor: KAI.success, count: (mb['exact_cache'] ?? 0) + (mb['correction'] ?? 0) },
    { label: '③ ベクター検索 direct', color: KAI.blue,   tag: '安価', tagColor: KAI.blue,   count: mb['vector_direct'] ?? 0 },
    { label: '④ ベクター rerank',    color: KAI.cyan,    tag: '安価', tagColor: KAI.cyan,    count: mb['vector_rerank'] ?? 0 },
    { label: '⑤ AI分類 Haiku',      color: KAI.violet,  tag: '有料', tagColor: KAI.violet,  count: (mb['llm_full'] ?? 0) + (mb['llm_freeform'] ?? 0) + (mb['llm_force'] ?? 0) },
  ]
  return { layers, total }
}

// ── Shared sub-components ────────────────────────────────────────

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: KAI.cardBg, border: `1px solid ${KAI.border2}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  )
}

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: color ?? KAI.text3, textTransform: 'uppercase' as const, ...MONO }}>{children}</span>
}

function StackBar({ layers, total, height = 11 }: { layers: Layer[]; total: number; height?: number }) {
  return (
    <div style={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', gap: 1.5 }}>
      {layers.map(l => {
        const pct = (l.count / total) * 100
        if (pct < 0.5) return null
        return <div key={l.label} style={{ width: `${pct}%`, background: l.color }} />
      })}
    </div>
  )
}

function TierRow({ layer, total }: { layer: Layer; total: number }) {
  const pct = total > 0 ? Math.round((layer.count / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderTop: `1px solid ${KAI.border}` }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: layer.color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12, color: KAI.text2 }}>{layer.label}</span>
      <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.04em', padding: '2px 6px', borderRadius: 5, color: layer.tagColor, background: `${layer.tagColor}1e`, ...MONO }}>{layer.tag}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, width: 42, textAlign: 'right' as const, color: layer.color, ...MONO }}>{pct}%</span>
    </div>
  )
}

function Donut({ layers, total, cacheRate }: { layers: Layer[]; total: number; cacheRate: number }) {
  let acc = 0
  const stops = layers.map(l => {
    const pct = (l.count / total) * 100
    const from = acc
    acc += pct
    return `${l.color} ${from}% ${acc}%`
  }).join(', ')

  return (
    <div style={{
      width: 158, height: 158, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${stops})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 15, borderRadius: '50%',
        background: KAI.bgCard, boxShadow: `inset 0 0 0 1px ${KAI.border}`,
      }} />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: KAI.mint, ...MONO }}>
          {Math.round(cacheRate * 100)}<span style={{ fontSize: 18 }}>%</span>
        </div>
        <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', marginTop: 4, ...MONO }}>CACHE RATE</div>
      </div>
    </div>
  )
}

// ── Cost breakdown ────────────────────────────────────────────────

interface CostModel { name: string; sub: string; color: string; amount: number }

function computeCostModels(byModel: Record<string, { calls: number; cost_usd: number }>): CostModel[] {
  const models: CostModel[] = []
  for (const [model, data] of Object.entries(byModel)) {
    const jpy = Math.ceil(data.cost_usd * 150)
    if (model.includes('haiku')) models.push({ name: 'Haiku', sub: '分類', color: KAI.violet, amount: jpy })
    else if (model.includes('sonnet')) models.push({ name: 'Sonnet', sub: 'サマリー・チャット', color: KAI.blue, amount: jpy })
    else models.push({ name: model, sub: '', color: KAI.cyan, amount: jpy })
  }
  models.sort((a, b) => b.amount - a.amount)
  return models
}

// ── Main page ─────────────────────────────────────────────────────

export default function AiAnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: () => fetch('/api/admin/analytics').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    }),
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen" style={{ background: KAI.bgCard }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: 'radial-gradient(ellipse 600px 400px at 80% 6%, rgba(94,234,212,.10), transparent 55%)' }} />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Link
            href="/settings"
            style={{
              width: 34, height: 34, borderRadius: 11, flexShrink: 0,
              background: KAI.overlayWeak, border: `1px solid ${KAI.border2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.text2} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: KAI.text1 }}>AI運用分析</div>
            <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2 }}>分類パイプラインの効率とコスト</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,.10)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 99, padding: '5px 10px', marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: KAI.success }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: KAI.success }}>健全</span>
          </div>
        </div>

        {isLoading && (
          <div className="px-4 space-y-3 pb-32 lg:pb-10">
            <Skeleton variant="panel" className="h-52" />
            <Skeleton variant="panel" className="h-64" />
            <Skeleton variant="panel" className="h-40" />
          </div>
        )}

        {error && (
          <div className="px-4 py-10 text-center">
            <p style={{ color: KAI.danger, fontSize: 14 }}>データの取得に失敗しました</p>
            <p style={{ color: KAI.text4, fontSize: 12, marginTop: 4 }}>管理者権限が必要です</p>
          </div>
        )}

        {data && (
          <>
            {/* Mobile layout */}
            <div className="lg:hidden" style={{ padding: '4px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MobileContent data={data} />
            </div>

            {/* Desktop layout */}
            <div className="hidden lg:block" style={{ padding: '24px 28px 30px' }}>
              <DesktopContent data={data} />
            </div>
          </>
        )}
      </div>

      <BottomBar />
    </div>
  )
}

// ── Mobile content ────────────────────────────────────────────────

function MobileContent({ data }: { data: AnalyticsData }) {
  const { layers, total } = computeLayers(data.methodBreakdown)
  const cacheRate = data.summary.hitRate
  const llmReduction = total > 0 ? Math.round(((layers[0].count + layers[1].count + layers[2].count + layers[3].count) / total) * 100) : 0
  const costModels = computeCostModels(data.cost.byModel)
  const totalCostJpy = data.cost.totalCostJpy

  const growthData = data.ragGrowthCurve
  const firstRate = growthData[0]?.exactCacheRate ?? 0
  const lastRate = growthData[growthData.length - 1]?.exactCacheRate ?? 0
  const growthDelta = Math.round((lastRate - firstRate) * 100)

  return (
    <>
      {/* Hero: cache rate donut */}
      <Panel style={{
        padding: '20px 18px',
        background: `linear-gradient(135deg, rgba(94,234,212,.07), ${KAI.cardBg})`,
        borderColor: 'rgba(94,234,212,.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Donut layers={layers} total={total} cacheRate={cacheRate} />
          <div style={{ flex: 1 }}>
            <Label color={KAI.mint}>キャッシュ率</Label>
            <p style={{ fontSize: 11.5, color: KAI.text2, lineHeight: 1.6, margin: '8px 0 0' }}>
              ルール・完全一致・ベクター検索で<strong style={{ color: KAI.text1 }}>LLMを介さず</strong>自動分類できた割合。
            </p>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: KAI.text3 }}>LLM削減率</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: KAI.success, ...MONO }}>▲ {llmReduction}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: KAI.text3 }}>今月コスト</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: KAI.coral, ...MONO }}>¥{totalCostJpy.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Method breakdown */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <Label>分類メソッド内訳</Label>
          <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO }}>直近30日 · {data.summary.total.toLocaleString()}件</span>
        </div>
        <StackBar layers={layers} total={total} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: KAI.text4, marginTop: 6, marginBottom: 8, ...MONO }}>
          <span>無料・即時 ←</span><span>→ 有料・LLM</span>
        </div>
        {layers.map(l => <TierRow key={l.label} layer={l} total={total} />)}
      </Panel>

      {/* Cache growth */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <Label>キャッシュ成長曲線（週次）</Label>
          <span style={{ fontSize: 11, fontWeight: 700, color: KAI.success, ...MONO }}>
            {growthDelta >= 0 ? '+' : ''}{growthDelta}pt / {growthData.length}週
          </span>
        </div>
        <CacheGrowthChart data={growthData} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: KAI.text4, marginTop: 4, ...MONO }}>
          <span>{Math.round(firstRate * 100)}%</span>
          <span>学習店舗が増えるほどキャッシュ率↑</span>
          <span style={{ color: KAI.mint }}>{Math.round(lastRate * 100)}%</span>
        </div>
      </Panel>

      {/* Two small stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Panel style={{ padding: 14 }}>
          <Label>分類精度</Label>
          <div style={{ fontSize: 24, fontWeight: 800, color: KAI.success, marginTop: 8, lineHeight: 1, ...MONO }}>
            {(data.coverage.golden.rate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: KAI.text4, marginTop: 6 }}>Golden Dataset {data.coverage.golden.total}件</div>
        </Panel>
        <Panel style={{ padding: 14 }}>
          <Label>RAG学習店舗</Label>
          <div style={{ fontSize: 24, fontWeight: 800, color: KAI.blue, marginTop: 8, lineHeight: 1, ...MONO }}>
            {data.ragStats.totalLearned}
          </div>
          <div style={{ fontSize: 10, color: KAI.text4, marginTop: 6 }}>
            高信頼 {data.ragStats.highConfidence} · 平均conf {data.summary.avgConfidence > 0 ? data.summary.avgConfidence.toFixed(2) : '—'}
          </div>
        </Panel>
      </div>

      {/* Cost breakdown */}
      <Panel style={{ padding: '15px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <Label>AIコスト内訳（モデル別）</Label>
          <span style={{ fontSize: 13, fontWeight: 800, color: KAI.coral, ...MONO }}>¥{totalCostJpy.toLocaleString()} / 月</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {costModels.map(m => {
            const maxAmt = Math.max(...costModels.map(c => c.amount), 1)
            return (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                  <span style={{ color: KAI.text2 }}>{m.name} <span style={{ color: KAI.text4, fontSize: 10, ...MONO }}>{m.sub}</span></span>
                  <span style={{ color: m.color, fontWeight: 700, ...MONO }}>¥{m.amount}</span>
                </div>
                <div style={{ height: 7, borderRadius: 99, background: KAI.overlayWeak, overflow: 'hidden' }}>
                  <div style={{ width: `${(m.amount / maxAmt) * 100}%`, height: '100%', background: m.color }} />
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </>
  )
}

// ── Desktop content ───────────────────────────────────────────────

function DesktopContent({ data }: { data: AnalyticsData }) {
  const { layers, total } = computeLayers(data.methodBreakdown)
  const cacheRate = data.summary.hitRate
  const llmReduction = total > 0 ? Math.round(((layers[0].count + layers[1].count + layers[2].count + layers[3].count) / total) * 100) : 0
  const costModels = computeCostModels(data.cost.byModel)
  const totalCostJpy = data.cost.totalCostJpy

  const growthData = data.ragGrowthCurve
  const firstRate = growthData[0]?.exactCacheRate ?? 0
  const lastRate = growthData[growthData.length - 1]?.exactCacheRate ?? 0

  const lowConfItems = data.lowConfidenceMisses.slice(0, 5)
  const failedCount = data.failedRows.length + lowConfItems.length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 16 }}>

      {/* KPI row */}
      <Panel style={{
        gridColumn: 'span 3', padding: '16px 18px',
        background: `linear-gradient(135deg, rgba(94,234,212,.10), ${KAI.cardBg})`,
        borderColor: 'rgba(94,234,212,.22)',
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: KAI.mint, lineHeight: 1, letterSpacing: '-.02em', ...MONO }}>{Math.round(cacheRate * 100)}%</div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 8 }}>キャッシュ率 <span style={{ color: KAI.text4 }}>（LLM不要で分類）</span></div>
        <div style={{ fontSize: 10.5, color: KAI.success, marginTop: 6, ...MONO }}>▲ LLM削減率 {llmReduction}%</div>
      </Panel>

      <Panel style={{ gridColumn: 'span 3', padding: '16px 18px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: KAI.success, lineHeight: 1, letterSpacing: '-.02em', ...MONO }}>{(data.coverage.golden.rate * 100).toFixed(1)}%</div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 8 }}>分類精度 <span style={{ color: KAI.text4 }}>（Golden {data.coverage.golden.total}件）</span></div>
        <div style={{ fontSize: 10.5, color: KAI.success, marginTop: 6, ...MONO }}>カバー率 {data.coverage.golden.covered}/{data.coverage.golden.total}</div>
      </Panel>

      <Panel style={{ gridColumn: 'span 3', padding: '16px 18px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: KAI.coral, lineHeight: 1, letterSpacing: '-.02em', ...MONO }}>¥{totalCostJpy}</div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 8 }}>今月のAIコスト</div>
        <div style={{ fontSize: 10.5, color: KAI.success, marginTop: 6, ...MONO }}>削減率 {llmReduction}% vs 全LLM</div>
      </Panel>

      <Panel style={{ gridColumn: 'span 3', padding: '16px 18px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: KAI.blue, lineHeight: 1, letterSpacing: '-.02em', ...MONO }}>{data.ragStats.totalLearned}</div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 8 }}>RAG学習店舗 <span style={{ color: KAI.text4 }}>（高信頼{data.ragStats.highConfidence}）</span></div>
        <div style={{ fontSize: 10.5, color: KAI.blue, marginTop: 6, ...MONO }}>平均conf {data.summary.avgConfidence > 0 ? data.summary.avgConfidence.toFixed(2) : '—'}</div>
      </Panel>

      {/* Pipeline breakdown (span 7) */}
      <Panel style={{ gridColumn: 'span 7', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <Label>分類メソッド内訳 — 直近30日 · {data.summary.total.toLocaleString()}件</Label>
          <span style={{ fontSize: 10, color: KAI.text4, ...MONO }}>無料 ← → 有料</span>
        </div>
        <StackBar layers={layers} total={total} height={14} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {layers.map(l => {
            const pct = total > 0 ? Math.round((l.count / total) * 100) : 0
            const costMap: Record<string, string> = { '① キーワードルール': '¥0', '② 完全一致キャッシュ': '¥0', '③ ベクター検索 direct': '¥1', '④ ベクター rerank': '¥2' }
            const costStr = costMap[l.label] ?? `¥${costModels.find(c => c.color === l.color)?.amount ?? '?'}`
            return (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <span style={{ width: 108, fontSize: 11.5, color: l.color, flexShrink: 0 }}>{l.label}</span>
                <div style={{ flex: 1, height: 9, borderRadius: 99, background: KAI.overlayWeak, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: l.color, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11, color: KAI.text3, width: 66, textAlign: 'right' as const, flexShrink: 0, ...MONO }}>{pct}% · {costStr}</span>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Cache growth (span 5) */}
      <Panel style={{ gridColumn: 'span 5', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
          <Label>キャッシュ成長曲線（週次）</Label>
          <span style={{ fontSize: 11, fontWeight: 700, color: KAI.success, ...MONO }}>{Math.round(firstRate * 100)}% → {Math.round(lastRate * 100)}%</span>
        </div>
        <p style={{ fontSize: 11, color: KAI.text3, margin: '0 0 12px', lineHeight: 1.5 }}>学習店舗の増加に伴いキャッシュ率が上昇。LLM呼び出しが逓減。</p>
        <CacheGrowthChart data={growthData} height={150} />
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: KAI.mint, ...MONO }}>▬ キャッシュ率</span>
          <span style={{ fontSize: 10, color: KAI.violet, ...MONO }}>- - LLM呼び出し</span>
        </div>
      </Panel>

      {/* 要対応ログ (span 7) */}
      <Panel style={{ gridColumn: 'span 7', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <Label>要対応ログ — 低精度・分類失敗</Label>
          <span style={{ fontSize: 11, color: KAI.warning, fontWeight: 700 }}>{failedCount}件</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lowConfItems.length === 0 && data.failedRows.length === 0 && (
            <p style={{ fontSize: 12, color: KAI.text4, textAlign: 'center', padding: 16 }}>対応が必要なログはありません</p>
          )}
          {lowConfItems.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px',
              background: KAI.overlayWeak, border: `1px solid ${KAI.border}`, borderRadius: 10,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: (item.confidence ?? 0) < 0.5 ? KAI.danger : KAI.warning, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: KAI.text2 }}>{item.payee}</span>
              <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>conf {(item.confidence ?? 0).toFixed(2)}</span>
              <span style={{ fontSize: 11, color: KAI.text3, width: 96 }}>{item.category_name ?? '未分類'}</span>
              <Link href="/settings/corrections" style={{
                fontSize: 10.5, color: KAI.mint, fontFamily: 'inherit',
                background: 'rgba(94,234,212,.10)', border: '1px solid rgba(94,234,212,.22)',
                borderRadius: 7, padding: '4px 10px', cursor: 'pointer', textDecoration: 'none',
              }}>修正</Link>
            </div>
          ))}
        </div>
      </Panel>

      {/* AI改善提案 (span 5) */}
      <Panel style={{
        gridColumn: 'span 5', padding: '18px 20px',
        background: `linear-gradient(135deg, rgba(167,139,250,.10), ${KAI.cardBg})`,
        borderColor: 'rgba(167,139,250,.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={KAI.violet} strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" /></svg>
          <Label color={KAI.violet}>AI改善提案 · Haiku生成</Label>
        </div>
        <AiSuggestions data={data} />
      </Panel>
    </div>
  )
}

// ── AI Suggestions (client) ───────────────────────────────────────

function AiSuggestions({ data }: { data: AnalyticsData }) {
  const [triggered, setTriggered] = useState(false)
  const { data: insightData, isLoading } = useQuery<{ insight: string }>({
    queryKey: ['admin-analytics-insight'],
    queryFn: () => fetch('/api/admin/analytics/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: data.summary,
        methodBreakdown: data.methodBreakdown,
        cost: data.cost,
        coverage: data.coverage,
      }),
    }).then(r => r.json()),
    enabled: triggered,
    staleTime: 300_000,
  })

  if (!triggered) {
    return (
      <button
        onClick={() => setTriggered(true)}
        style={{
          width: '100%', padding: 10, borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
          background: 'rgba(167,139,250,.16)', border: '1px solid rgba(167,139,250,.32)',
          color: KAI.violet, fontSize: 12.5, fontWeight: 700,
        }}
      >
        AIに改善提案を生成させる
      </button>
    )
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton variant="line-md" />
        <Skeleton variant="line-md" />
      </div>
    )
  }

  const lines = (insightData?.insight ?? '').split('\n').filter(l => l.trim().startsWith('-'))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lines.slice(0, 3).map((line, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span style={{ color: KAI.mint, fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>{'①②③'[i]}</span>
          <p style={{ margin: 0, fontSize: 12, color: KAI.text2, lineHeight: 1.6 }}>{line.replace(/^-\s*[✓⚠🔴]\s*/, '').trim()}</p>
        </div>
      ))}
      {lines.length === 0 && <p style={{ fontSize: 12, color: KAI.text4 }}>提案がありません</p>}
    </div>
  )
}
