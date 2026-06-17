'use client'

import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, RefreshCw, Sparkles, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

// 分類メソッドの日本語ラベルと説明
const METHOD_META: Record<string, { label: string; desc: string; color: string }> = {
  correction:    { label: '手動修正',         desc: 'ユーザーが手動でカテゴリを修正した結果',                   color: KAI.violet  },
  regex_rule:    { label: 'キーワードルール',  desc: '登録済みキーワードで即座に一致（最速・無料）',              color: KAI.green   },
  exact_cache:   { label: 'キャッシュ完全一致', desc: '過去の分類結果を再利用（高速・無料）',                    color: KAI.success },
  vector_direct: { label: 'ベクター検索',      desc: '意味の近い過去分類を参照して分類（中速・安価）',            color: KAI.info    },
  vector_rerank: { label: 'ベクター再ランク',  desc: '複数候補から精度の高い結果を選択（中速・安価）',            color: KAI.cyan    },
  llm_full:      { label: 'AI分類（Haiku）',  desc: 'Claudeが文脈を読んで分類（低速・有料）',                  color: KAI.coral   },
  llm_freeform:  { label: 'AI自由分類',       desc: 'カテゴリが不明なときにAIが推測（低速・有料）',              color: KAI.orange  },
  failed:        { label: '分類失敗',          desc: 'どの手段でも分類できなかった（要対応）',                   color: KAI.danger  },
}

const FEATURE_LABEL: Record<string, string> = {
  classification:   '支出分類（Haiku）',
  chat:             'AIチャット（Sonnet）',
  monthly_summary:  '月次サマリー（Sonnet）',
  budget_suggest:   '予算提案（Haiku）',
  spending_pattern: '支出傾向分析（Haiku）',
}

interface AnalyticsData {
  summary: {
    total: number
    cacheHits: number
    hitRate: number
    totalApiCalls: number
    avgLatency: number
    p95Latency: number
    avgConfidence: number
    avgSimilarity: number
    sampleSize: number
  }
  methodBreakdown: Record<string, number>
  dailyStats: Array<{ day: string; total: number; hitRate: number; apiCalls: number; avgLatency: number }>
  lowConfidenceMisses: Array<{
    created_at: string
    payee: string
    payee_key: string
    category_name: string | null
    method: string
    confidence: number | null
    similarity: number | null
    latency_ms: number | null
  }>
  failedRows: Array<{
    created_at: string
    payee: string
    payee_key: string
    latency_ms: number | null
  }>
  cost: {
    totalCostUsd: number
    totalCostJpy: number
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
    date: string
    cacheRate: number | null
    llmRate: number | null
    failedRate: number | null
    totalClassified: number
    totalLearned: number
    costUsd: number | null
  }>
  ragStats: {
    totalLearned: number
    highConfidence: number
    hitCountDist: {
      once: number
      twice: number
      threeFour: number
      fiveNine: number
      tenPlus: number
    }
  }
}

// ── 小コンポーネント ──────────────────────────────────────────────

function SectionHeading({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{
        fontSize: 11, fontWeight: 700, color: KAI.text4,
        letterSpacing: '.14em', textTransform: 'uppercase', margin: 0,
      }}>
        {children}
      </h2>
      {hint && (
        <p style={{ fontSize: 11, color: KAI.text4, marginTop: 4, lineHeight: 1.6 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.025)',
      border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 14,
      ...style,
    }}>
      {children}
    </div>
  )
}

function StatCard({
  label, value, sub, color, trend, description,
}: {
  label: string; value: string; sub?: string; color?: string
  trend?: 'up' | 'down' | 'neutral'; description?: string
}) {
  return (
    <Panel style={{ padding: '14px 18px' }}>
      <p style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <p style={{ fontSize: 26, fontWeight: 800, color: color ?? KAI.text1, ...MONO, letterSpacing: '-.02em', margin: 0 }}>
          {value}
        </p>
        {trend && (
          <span style={{ color: trend === 'up' ? KAI.green : trend === 'down' ? KAI.danger : KAI.text4 }}>
            {trend === 'up' ? <TrendingUp size={13}/> : trend === 'down' ? <TrendingDown size={13}/> : <Minus size={13}/>}
          </span>
        )}
      </div>
      {sub && <p style={{ fontSize: 11, color: KAI.text4, marginTop: 3 }}>{sub}</p>}
      {description && (
        <p style={{ fontSize: 10, color: KAI.text4, marginTop: 5, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 5 }}>
          {description}
        </p>
      )}
    </Panel>
  )
}

function StatusBadge({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const color = ok ? KAI.green : warn ? KAI.warning : KAI.danger
  const bg = ok ? 'rgba(74,222,128,.10)' : warn ? 'rgba(251,191,36,.10)' : 'rgba(251,113,133,.10)'
  const border = ok ? 'rgba(74,222,128,.25)' : warn ? 'rgba(251,191,36,.25)' : 'rgba(251,113,133,.25)'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: bg, border: `1px solid ${border}`, color, letterSpacing: '.04em',
    }}>
      {ok ? '✓ ' : warn ? '⚠ ' : '✗ '}{label}
    </span>
  )
}

function SectionSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton variant="line-sm" className="w-32 mb-2"/>
      <Skeleton variant="panel"/>
    </div>
  )
}

// ── main ──────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AnalyticsData>({
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

  const { mutate: generateInsight, isPending: insightPending, data: insightData, error: insightError } = useMutation<
    { insight: string },
    Error
  >({
    mutationFn: () => {
      if (!data) throw new Error('データがありません')
      return fetch('/api/admin/analytics/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: data.summary,
          methodBreakdown: data.methodBreakdown,
          cost: data.cost,
          coverage: data.coverage,
        }),
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '生成失敗')
        return j
      })
    },
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a14', color: KAI.text1 }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{
        zIndex: 0,
        backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 20%, rgba(251,148,119,.07), transparent 55%),
          radial-gradient(ellipse 500px 300px at 20% 80%, rgba(122,167,255,.05), transparent 55%)`,
      }}/>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{
        zIndex: 1,
        backgroundImage: `linear-gradient(rgba(255,255,255,.01) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.01) 1px,transparent 1px)`,
        backgroundSize: '40px 40px',
      }}/>

      <Sidebar/>

      <div className="relative lg:pl-[220px]" style={{ zIndex: 2 }}>
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5" style={{
          background: 'rgba(8,8,14,.6)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/settings" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: KAI.text4, textDecoration: 'none',
            }}>
              <ChevronLeft size={14} strokeWidth={2}/> 設定
            </Link>
            <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 12 }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>AI 運用分析</span>
            <span style={{ fontSize: 10, color: KAI.text4 }}>管理者専用</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, color: isFetching ? KAI.text4 : KAI.coral, fontWeight: 600,
              background: 'rgba(251,148,119,.07)', border: '1px solid rgba(251,148,119,.18)',
              borderRadius: 8, padding: '5px 10px', cursor: isFetching ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={11} strokeWidth={2} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}/>
            更新
          </button>
        </header>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 96px' }}>

          {/* ── エラー ─────────────────────────────────────────────── */}
          {isError && (
            <Panel style={{ padding: '28px 24px', textAlign: 'center', borderColor: `${KAI.danger}33` }}>
              <p style={{ fontSize: 13, color: KAI.danger, fontWeight: 600, marginBottom: 8 }}>
                {error instanceof Error && error.message.includes('管理者')
                  ? '管理者権限が必要です'
                  : `読み込みに失敗しました — ${error instanceof Error ? error.message : 'Unknown error'}`}
              </p>
              {error instanceof Error && error.message.includes('管理者') && (
                <p style={{ fontSize: 12, color: KAI.text4, lineHeight: 1.6 }}>
                  Supabase で <code style={{ ...MONO, background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4 }}>is_admin = true</code> に設定してください
                </p>
              )}
            </Panel>
          )}

          {/* ── ローディング ────────────────────────────────────────── */}
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Panel key={i} style={{ padding: '14px 18px' }}>
                    <Skeleton variant="line-sm" className="w-24 mb-3"/>
                    <Skeleton variant="line-lg"/>
                  </Panel>
                ))}
              </div>
              <SectionSkeleton/>
              <SectionSkeleton/>
            </div>
          )}

          {/* ── データ表示 ──────────────────────────────────────────── */}
          {data && (() => {
            const { summary, methodBreakdown, dailyStats, lowConfidenceMisses, failedRows, cost, coverage, ragStats } = data
            const methodEntries = Object.entries(methodBreakdown).sort(([, a], [, b]) => b - a)

            // LLM削減率（LLMを使わずに分類できた割合）
            const llmCount = (methodBreakdown.llm_full ?? 0) + (methodBreakdown.llm_freeform ?? 0)
            const llmReductionRate = summary.sampleSize > 0
              ? (summary.sampleSize - llmCount) / summary.sampleSize
              : 0

            // hit_count分布データ（棒グラフ用）
            const hitDistData = [
              { label: '1回', count: ragStats?.hitCountDist?.once ?? 0 },
              { label: '2回', count: ragStats?.hitCountDist?.twice ?? 0 },
              { label: '3〜4回', count: ragStats?.hitCountDist?.threeFour ?? 0 },
              { label: '5〜9回', count: ragStats?.hitCountDist?.fiveNine ?? 0 },
              { label: '10回+', count: ragStats?.hitCountDist?.tenPlus ?? 0 },
            ]

            // 基準線：2026-06-17（hit_count修正デプロイ日）を含む週の月曜日
            const FIX_WEEK_LABEL = '06-15'  // YYYY-MM-DD から slice(5) した MM-DD
            const FIX_DAY_LABEL  = '06-17'

            // キャッシュ率の健全度判定
            const hitRateOk   = summary.hitRate >= 0.7
            const hitRateWarn = !hitRateOk && summary.hitRate >= 0.4
            const latencyOk   = summary.avgLatency < 1000
            const latencyWarn = !latencyOk && summary.avgLatency < 3000
            const confOk      = summary.avgConfidence >= 0.85
            const confWarn    = !confOk && summary.avgConfidence >= 0.65
            const goldenOk    = coverage.golden.rate >= 0.9
            const goldenWarn  = !goldenOk && coverage.golden.rate >= 0.7

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

                {/* ── 0. このページの説明 ─────────────────────────────── */}
                <Panel style={{ padding: '14px 20px', borderColor: 'rgba(167,139,250,.20)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Info size={14} style={{ color: KAI.violet, flexShrink: 0, marginTop: 2 }}/>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: KAI.text2, marginBottom: 4 }}>
                        このページについて
                      </p>
                      <p style={{ fontSize: 12, color: KAI.text3, lineHeight: 1.8 }}>
                        KAIが支出を自動で分類するときにどの方法を使ったか、精度はどうか、コストはいくらかを管理者向けに表示しています。
                        キャッシュヒット率が高いほど API 呼び出しが減り、コストが下がります。
                        分類失敗件数が増えたらキーワードルールの追加を検討してください。
                      </p>
                    </div>
                  </div>
                </Panel>

                {/* ── 1. AI インサイト ────────────────────────────────── */}
                <Panel style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: insightData ? 14 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={14} style={{ color: KAI.violet, flexShrink: 0 }}/>
                      <span style={{ fontSize: 12, fontWeight: 700, color: KAI.text2 }}>AI 改善提案</span>
                      <span style={{ fontSize: 10, color: KAI.text4 }}>現在のデータをもとに自動分析します</span>
                    </div>
                    <button
                      onClick={() => generateInsight()}
                      disabled={insightPending || summary.total === 0}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600,
                        color: insightPending ? KAI.text4 : KAI.violet,
                        background: `rgba(167,139,250,${insightPending ? '.04' : '.08'})`,
                        border: `1px solid rgba(167,139,250,${insightPending ? '.12' : '.25'})`,
                        borderRadius: 8, padding: '5px 10px', cursor: insightPending ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', transition: 'all .15s',
                      }}
                    >
                      <Sparkles size={10} strokeWidth={2} style={{ animation: insightPending ? 'kai-pulse-mint 1.2s ease-in-out infinite' : 'none' }}/>
                      {insightPending ? '分析中…' : insightData ? '再分析' : 'このデータを分析する'}
                    </button>
                  </div>

                  {insightData && (() => {
                    const lines = insightData.insight.split('\n').filter((l) => l.trim())
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {lines.map((line, i) => {
                          const isGood = line.startsWith('✓')
                          const isWarn = line.startsWith('⚠')
                          const isCrit = line.startsWith('🔴')
                          const color = isCrit ? KAI.danger : isWarn ? KAI.warning : isGood ? KAI.green : KAI.text3
                          return (
                            <p key={i} style={{ fontSize: 13, lineHeight: 1.75, color, margin: 0 }}>
                              {line.replace(/^[-*]\s*/, '')}
                            </p>
                          )
                        })}
                      </div>
                    )
                  })()}

                  {insightError && (
                    <p style={{ fontSize: 12, color: KAI.danger, marginTop: 8 }}>{insightError.message}</p>
                  )}

                  {!insightData && !insightPending && (
                    <p style={{ fontSize: 12, color: KAI.text4, marginTop: 10 }}>
                      ボタンを押すと改善ポイントを自動でまとめます（Haiku 使用・数秒かかります）
                    </p>
                  )}
                </Panel>

                {/* ── RAG学習状況 ─────────────────────────────────────── */}
                {ragStats && (
                  <section>
                    <SectionHeading hint="category_rag テーブルの現在の学習蓄積状況です。学習済み店舗が増えるほどキャッシュヒット率が向上し、LLMコストが下がります。">
                      RAG 学習状況
                    </SectionHeading>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 16 }}>
                      <StatCard
                        label="学習済み店舗数"
                        value={ragStats.totalLearned.toLocaleString('ja-JP')}
                        sub="全期間の蓄積"
                        color={KAI.green}
                        description="exact_cache の対象となる店舗の総数。増えるほどAPI不要で分類できます"
                      />
                      <StatCard
                        label="高信頼店舗数"
                        value={ragStats.highConfidence.toLocaleString('ja-JP')}
                        sub={`hit_count ≥ 3 — 全体の${ragStats.totalLearned > 0 ? Math.round(ragStats.highConfidence / ragStats.totalLearned * 100) : 0}%`}
                        color={KAI.violet}
                        description="3回以上分類実績のある店舗。繰り返しの実績があり信頼性が高い状態です"
                      />
                      <StatCard
                        label="LLM 削減率"
                        value={`${(llmReductionRate * 100).toFixed(1)}%`}
                        sub={`LLM呼び出し ${llmCount.toLocaleString()}件 / ${summary.sampleSize.toLocaleString()}件`}
                        color={llmReductionRate >= 0.8 ? KAI.green : llmReductionRate >= 0.5 ? KAI.warning : KAI.danger}
                        description="Claude APIを呼び出さずに分類できた割合。高いほどコスト効率が良い状態です"
                      />
                    </div>

                    {/* hit_count 分布グラフ */}
                    {hitDistData.some(d => d.count > 0) && (
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>
                            hit_count 分布 — 学習の深さ
                          </p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>
                            右（高 hit_count）に偏るほど、繰り返し学習が進んでいる証拠です
                          </p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={hitDistData} margin={{ left: 0, right: 12 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false}/>
                            <XAxis type="number" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}/>
                            <YAxis
                              type="category" dataKey="label" width={52}
                              tick={{ fontSize: 10, fill: KAI.text4 }} tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => [`${v}件`, '店舗数']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Bar dataKey="count" name="店舗数" radius={[0, 3, 3, 0]}>
                              {hitDistData.map((d, i) => {
                                const colors = [KAI.text4, KAI.text3, KAI.info, KAI.violet, KAI.green]
                                return <Cell key={i} fill={colors[i]} opacity={0.8}/>
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <p style={{ fontSize: 10, color: KAI.text4, padding: '0 8px 4px', lineHeight: 1.5 }}>
                          「10回+」の店舗は RAG_REPEAT_THRESHOLD（0.75）が適用され、より低い confidence でもキャッシュヒットします
                        </p>
                      </Panel>
                    )}
                  </section>
                )}

                {/* ── 2. 健全度サマリー ────────────────────────────────── */}
                <section>
                  <SectionHeading hint="全期間の累計件数をもとにした集計です。">
                    システム健全度 — 全期間累計
                  </SectionHeading>

                  {/* ステータスバッジ一覧 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    <StatusBadge ok={hitRateOk} warn={hitRateWarn} label={`キャッシュ率 ${(summary.hitRate * 100).toFixed(1)}%`}/>
                    <StatusBadge ok={latencyOk} warn={latencyWarn} label={`応答速度 ${summary.avgLatency}ms`}/>
                    <StatusBadge ok={confOk} warn={confWarn} label={`分類精度 ${summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(3) : 'N/A'}`}/>
                    <StatusBadge ok={goldenOk} warn={goldenWarn} label={`テストカバー ${(coverage.golden.rate * 100).toFixed(1)}%`}/>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                    <StatCard
                      label="総分類件数"
                      value={summary.total.toLocaleString('ja-JP')}
                      sub="全期間の累計"
                      description="CSV取込・MF自動取得で分類された支出の累計数です"
                    />
                    <StatCard
                      label="キャッシュヒット率"
                      value={`${(summary.hitRate * 100).toFixed(1)}%`}
                      sub={`${summary.cacheHits.toLocaleString()} / ${summary.total.toLocaleString()} 件`}
                      color={hitRateOk ? KAI.green : hitRateWarn ? KAI.warning : KAI.danger}
                      description="API不要で即座に分類できた割合。70%以上が理想です"
                    />
                    <StatCard
                      label="API 呼び出し数"
                      value={summary.totalApiCalls.toLocaleString('ja-JP')}
                      sub="全期間（Anthropic API）"
                      color={KAI.coral}
                      description="Claudeを呼び出した合計回数。少ないほどコスト節約になります"
                    />
                    <StatCard
                      label="平均応答時間"
                      value={`${summary.avgLatency}ms`}
                      sub={`P95: ${summary.p95Latency}ms（参考値）`}
                      color={latencyOk ? KAI.green : latencyWarn ? KAI.warning : KAI.danger}
                      description="分類1件あたりの平均処理時間。1秒未満が理想です"
                    />
                    <StatCard
                      label="分類精度スコア"
                      value={summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(3) : 'N/A'}
                      sub="0〜1の信頼度（1が最高）"
                      color={confOk ? KAI.green : KAI.warning}
                      description="AIが分類結果をどれだけ確信しているかを示します。0.85以上が良好です"
                    />
                    <StatCard
                      label="ベクター類似度"
                      value={summary.avgSimilarity > 0 ? summary.avgSimilarity.toFixed(3) : 'N/A'}
                      sub={summary.avgSimilarity > 0 ? 'ベクター経路のみ' : 'ベクター未使用'}
                      color={KAI.info}
                      description="意味的な近さで分類した場合の一致度スコアです"
                    />
                  </div>

                  {summary.sampleSize < summary.total && (
                    <p style={{ fontSize: 11, color: KAI.text4, marginTop: 10, paddingLeft: 4 }}>
                      <span style={{ color: KAI.warning }}>※</span> 精度スコア・応答時間P95は直近 {summary.sampleSize.toLocaleString()} 件のサンプルから算出しています（全 {summary.total.toLocaleString()} 件のうち）
                    </p>
                  )}
                </section>

                {/* ── 3. 分類メソッド内訳 ──────────────────────────────── */}
                <section>
                  <SectionHeading hint="KAIは支出を分類するとき、コストが低い方法から順番に試みます。キャッシュ・ルール系の割合が高いほど低コストで運用できています。">
                    分類の仕組み — どの方法が使われたか
                  </SectionHeading>

                  {/* 方法の凡例 */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {['regex_rule', 'exact_cache', 'vector_direct', 'vector_rerank', 'llm_full', 'correction', 'failed'].map((m) => {
                      const meta = METHOD_META[m]
                      if (!meta) return null
                      return (
                        <span key={m} title={meta.desc} style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 99,
                          background: `${meta.color}14`, border: `1px solid ${meta.color}28`,
                          color: meta.color, cursor: 'help',
                        }}>
                          {meta.label}
                        </span>
                      )
                    })}
                  </div>

                  <Panel style={{ overflow: 'hidden' }}>
                    {methodEntries.length === 0 && (
                      <p style={{ padding: '20px', fontSize: 12, color: KAI.text4 }}>データなし</p>
                    )}
                    {methodEntries.map(([method, count], i) => {
                      const meta = METHOD_META[method]
                      const pct = summary.sampleSize > 0 ? count / summary.sampleSize : 0
                      return (
                        <div key={method} style={{
                          display: 'grid',
                          gridTemplateColumns: '140px 1fr 64px 52px',
                          alignItems: 'center',
                          gap: 12,
                          padding: '11px 16px',
                          borderBottom: i < methodEntries.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        }}>
                          {/* 方法名（日本語） */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: meta?.color ?? '#8b8ba0',
                            }}/>
                            <div>
                              <p style={{ fontSize: 12, color: KAI.text2, fontWeight: 600, margin: 0 }}>
                                {meta?.label ?? method}
                              </p>
                              <p style={{ fontSize: 10, color: KAI.text4, margin: 0 }}>
                                {meta?.desc ?? ''}
                              </p>
                            </div>
                          </div>

                          {/* バー */}
                          <div style={{ height: 6, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct * 100}%`,
                              background: meta?.color ?? '#8b8ba0',
                              borderRadius: 3,
                            }}/>
                          </div>

                          {/* 件数 */}
                          <span style={{ fontSize: 12, color: KAI.text3, ...MONO, textAlign: 'right' }}>
                            {count.toLocaleString()}件
                          </span>

                          {/* 割合 */}
                          <span style={{ fontSize: 12, fontWeight: 700, ...MONO, textAlign: 'right', color: meta?.color ?? KAI.text4 }}>
                            {(pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                  </Panel>

                  {summary.sampleSize > 0 && (
                    <p style={{ fontSize: 11, color: KAI.text4, marginTop: 8, paddingLeft: 4 }}>
                      直近 {summary.sampleSize.toLocaleString()} 件のサンプルから集計。「キャッシュ完全一致」+「キーワードルール」の合計が70%以上であれば理想的な状態です。
                    </p>
                  )}
                </section>

                {/* ── 4. パイプライン カバレッジ ───────────────────────── */}
                <section>
                  <SectionHeading hint="テスト用の代表的な支出データ（Golden Dataset）と、実際の運用での分類段階を確認します。">
                    分類精度のテスト結果
                  </SectionHeading>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                    {/* Golden dataset */}
                    <Panel style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>
                          テストデータ カバー率
                        </p>
                        <StatusBadge ok={goldenOk} warn={goldenWarn} label={goldenOk ? '良好' : goldenWarn ? '要注意' : '要改善'}/>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                        <span style={{
                          fontSize: 30, fontWeight: 800, ...MONO, letterSpacing: '-.02em',
                          color: goldenOk ? KAI.green : KAI.warning,
                        }}>
                          {(coverage.golden.rate * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: KAI.text4 }}>
                          {coverage.golden.covered}/{coverage.golden.total}件
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                          height: '100%', width: `${coverage.golden.rate * 100}%`,
                          background: goldenOk ? KAI.green : KAI.warning,
                          borderRadius: 3,
                        }}/>
                      </div>
                      <p style={{ fontSize: 11, color: KAI.text4, marginBottom: 8, lineHeight: 1.5 }}>
                        代表的な支出名をキーワードルールが正しく識別できるかのテストです（90%以上が目標）
                      </p>
                      {coverage.golden.misses.length > 0 ? (
                        <div>
                          <p style={{ fontSize: 10, color: KAI.text4, marginBottom: 6 }}>
                            未カバーの支出名（{coverage.golden.misses.length}件）— ルールに追加すると精度が上がります
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {coverage.golden.misses.slice(0, 10).map((m) => (
                              <span key={m} style={{
                                fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                background: `${KAI.coral}18`, border: `1px solid ${KAI.coral}28`,
                                color: KAI.coral, ...MONO,
                              }}>{m}</span>
                            ))}
                            {coverage.golden.misses.length > 10 && (
                              <span style={{ fontSize: 10, color: KAI.text4 }}>+{coverage.golden.misses.length - 10}件</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: 11, color: KAI.green }}>✓ 全件カバー済み — ルールは完全です</p>
                      )}
                    </Panel>

                    {/* Live pipeline */}
                    <Panel style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                        実際の分類段階（コスト順）
                      </p>
                      <p style={{ fontSize: 11, color: KAI.text4, marginBottom: 12, lineHeight: 1.5 }}>
                        上の段階ほど速く・安い方法です。なるべく上位で完結するのが理想です
                      </p>
                      {[
                        { label: '① キーワードルール', count: coverage.live.regexRule,  color: KAI.green,  note: '無料・即座' },
                        { label: '② ベクター検索',     count: coverage.live.vector,     color: KAI.info,   note: '安価・高速' },
                        { label: '③ AI分類（Haiku）',  count: coverage.live.llmFull,    color: KAI.coral,  note: '有料・低速' },
                        { label: '✓ 手動修正済み',     count: coverage.live.correction, color: KAI.violet, note: 'ユーザー補正' },
                        { label: '✗ 分類失敗',         count: coverage.live.failed,     color: KAI.danger, note: '要対応' },
                      ].map(({ label, count, color, note }) => {
                        const sampleTotal = summary.sampleSize
                        const pct = sampleTotal > 0 ? count / sampleTotal : 0
                        return (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 110, flexShrink: 0 }}>
                              <p style={{ fontSize: 11, color: KAI.text3, margin: 0, ...MONO }}>{label}</p>
                              <p style={{ fontSize: 9, color: KAI.text4, margin: 0 }}>{note}</p>
                            </div>
                            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3 }}/>
                            </div>
                            <span style={{ fontSize: 11, color: color, ...MONO, width: 54, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>
                              {count > 0 ? `${(pct * 100).toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </Panel>
                  </div>
                </section>

                {/* ── 5. 日次チャート ──────────────────────────────────── */}
                {dailyStats.length > 0 && (
                  <section>
                    <SectionHeading hint="過去30日間の推移です。キャッシュヒット率が右肩上がりなら、システムが学習・成長していることを示します。">
                      過去30日間のトレンド
                    </SectionHeading>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>キャッシュヒット率の推移</p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>高いほどAPI費用が少なくなります（目標: 70%以上）</p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={dailyStats} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}/>
                            <YAxis
                              domain={[0, 1]}
                              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                              tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={36}
                            />
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, 'キャッシュヒット率']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Line type="monotone" dataKey="hitRate" stroke={KAI.violet} strokeWidth={2} dot={false}/>
                            <ReferenceLine
                              x={FIX_DAY_LABEL}
                              stroke={KAI.warning}
                              strokeDasharray="4 2"
                              label={{ value: '改善', position: 'insideTopRight', fontSize: 9, fill: KAI.warning }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Panel>

                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>API 呼び出し数の推移</p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>少ないほどコスト削減できています</p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={dailyStats} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}/>
                            <YAxis tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={32}/>
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => [`${v}回`, 'API呼び出し']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Bar dataKey="apiCalls" name="API呼び出し" radius={[3, 3, 0, 0]}>
                              {dailyStats.map((_, i) => <Cell key={i} fill={KAI.coral} opacity={0.7}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Panel>
                    </div>
                  </section>
                )}

                {/* ── 6. RAGキャッシュ育成曲線 ─────────────────────────── */}
                {data.ragGrowthCurve.length > 0 && (
                  <section>
                    <SectionHeading hint="使い続けるほどキャッシュが育ち、APIを使わずに分類できる割合が増えます。右肩上がりが理想的です。">
                      キャッシュ成長曲線（週次）
                    </SectionHeading>
                    <Panel style={{ padding: '16px 8px 8px' }}>
                      <div style={{ padding: '0 8px 10px' }}>
                        <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>完全一致キャッシュのヒット率（週次）</p>
                        <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>同じ店舗への支出が蓄積されるほど率が上昇し、コストが下がります</p>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={data.ragGrowthCurve} margin={{ left: 0, right: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                          <XAxis dataKey="week" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}
                            tickFormatter={(v: string) => v.slice(5)}/>
                          <YAxis
                            domain={[0, 1]}
                            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                            tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={36}
                          />
                          <Tooltip
                            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                            formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, 'キャッシュヒット率']}
                            labelStyle={{ color: KAI.text3 }}
                            itemStyle={{ color: '#f0f0f5' }}
                          />
                          <Line type="monotone" dataKey="exactCacheRate" stroke={KAI.green} strokeWidth={2} dot={{ r: 3, fill: KAI.green }}/>
                          <ReferenceLine
                            x={FIX_WEEK_LABEL}
                            stroke={KAI.warning}
                            strokeDasharray="4 2"
                            label={{ value: 'hit_count改善', position: 'insideTopRight', fontSize: 9, fill: KAI.warning }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Panel>
                  </section>
                )}

                {/* ── 長期トレンド（日次スナップショット） ─────────────── */}
                <section>
                  <SectionHeading hint="Vercel Cron が毎朝 04:00 に前日の統計を自動記録します。データは翌朝から蓄積されます。">
                    長期トレンド — 日次スナップショット
                  </SectionHeading>

                  {data.healthSnapshots.length === 0 ? (
                    <Panel style={{ padding: '24px 20px', borderColor: 'rgba(167,139,250,.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: KAI.violet, flexShrink: 0,
                          animation: 'kai-pulse-mint 1.5s ease-in-out infinite',
                        }}/>
                        <div>
                          <p style={{ fontSize: 13, color: KAI.text2, fontWeight: 600, margin: 0 }}>
                            スナップショット蓄積中
                          </p>
                          <p style={{ fontSize: 11, color: KAI.text4, marginTop: 4 }}>
                            初回は翌朝 04:00 以降に表示されます。データが溜まると改善前後の比較が可能になります。
                          </p>
                        </div>
                      </div>
                    </Panel>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* キャッシュ率 長期推移 */}
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>
                            キャッシュ率 長期推移
                          </p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>
                            右肩上がりがRAG学習が進んでいる証拠です
                          </p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={data.healthSnapshots} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}
                              interval="preserveStartEnd"/>
                            <YAxis
                              domain={[0, 1]}
                              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                              tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={36}
                            />
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => v != null ? [`${(Number(v) * 100).toFixed(1)}%`, 'キャッシュ率'] : ['—', 'キャッシュ率']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Line type="monotone" dataKey="cacheRate" stroke={KAI.green} strokeWidth={2}
                              dot={false} connectNulls/>
                            <ReferenceLine
                              x={FIX_DAY_LABEL}
                              stroke={KAI.warning}
                              strokeDasharray="4 2"
                              label={{ value: '改善', position: 'insideTopRight', fontSize: 9, fill: KAI.warning }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Panel>

                      {/* 学習店舗数 長期推移 */}
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>
                            学習済み店舗数 長期推移
                          </p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>
                            使い続けるほど増加し、キャッシュ率向上につながります
                          </p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={data.healthSnapshots} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}
                              interval="preserveStartEnd"/>
                            <YAxis tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={36}/>
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => [`${v}件`, '学習済み店舗数']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Line type="monotone" dataKey="totalLearned" stroke={KAI.violet} strokeWidth={2}
                              dot={false} connectNulls/>
                          </LineChart>
                        </ResponsiveContainer>
                      </Panel>
                    </div>
                  )}
                </section>

                {/* ── 7. 要対応：低精度・失敗 ──────────────────────────── */}
                {(lowConfidenceMisses.length > 0 || failedRows.length > 0) && (
                  <section>
                    <SectionHeading hint="精度が低い分類や失敗した支出です。頻出する店舗はキーワードルールに追加することでAPIコストを削減できます。">
                      要対応 — 精度が低い分類・失敗ログ
                    </SectionHeading>

                    {/* 低信頼度ミス */}
                    {lowConfidenceMisses.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: KAI.warning, fontWeight: 600, marginBottom: 8 }}>
                          ⚠ 信頼度が低い分類（0.7未満）— {lowConfidenceMisses.length}件
                        </p>
                        <Panel style={{ overflow: 'hidden' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 110px 64px 64px 64px',
                            padding: '8px 14px',
                            borderBottom: '1px solid rgba(255,255,255,.07)',
                            background: 'rgba(255,255,255,.02)',
                          }}>
                            {['支払先', 'カテゴリ', '分類方法', '信頼度', '類似度', '応答時間'].map((h) => (
                              <span key={h} style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em' }}>
                                {h}
                              </span>
                            ))}
                          </div>
                          {lowConfidenceMisses.map((row, i) => (
                            <div key={i} style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 140px 110px 64px 64px 64px',
                              padding: '9px 14px', alignItems: 'center',
                              borderBottom: i < lowConfidenceMisses.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                            }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 12, color: KAI.text1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                  {row.payee}
                                </p>
                                <p style={{ fontSize: 10, color: KAI.text4, ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                  {row.payee_key}
                                </p>
                              </div>
                              <span style={{ fontSize: 11, color: KAI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.category_name ?? '—'}
                              </span>
                              <span style={{ fontSize: 11, color: METHOD_META[row.method]?.color ?? KAI.text3, ...MONO }}>
                                {METHOD_META[row.method]?.label ?? row.method}
                              </span>
                              <span style={{ fontSize: 11, ...MONO, color: row.confidence != null && row.confidence < 0.5 ? KAI.danger : KAI.warning }}>
                                {row.confidence != null ? row.confidence.toFixed(3) : '—'}
                              </span>
                              <span style={{ fontSize: 11, color: KAI.text3, ...MONO }}>
                                {row.similarity != null ? row.similarity.toFixed(3) : '—'}
                              </span>
                              <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>
                                {row.latency_ms != null ? `${row.latency_ms}ms` : '—'}
                              </span>
                            </div>
                          ))}
                        </Panel>
                      </div>
                    )}

                    {/* 失敗ログ */}
                    {failedRows.length > 0 && (
                      <div>
                        <p style={{ fontSize: 11, color: KAI.danger, fontWeight: 600, marginBottom: 8 }}>
                          ✗ 分類失敗（直近20件）
                        </p>
                        <Panel style={{ overflow: 'hidden' }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 180px 72px',
                            padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.07)',
                            background: 'rgba(255,255,255,.02)',
                          }}>
                            {['支払先', '正規化キー', '応答時間'].map((h) => (
                              <span key={h} style={{ fontSize: 10, color: KAI.text4, fontWeight: 700 }}>{h}</span>
                            ))}
                          </div>
                          {failedRows.map((row, i) => (
                            <div key={i} style={{
                              display: 'grid', gridTemplateColumns: '1fr 180px 72px',
                              padding: '9px 14px', alignItems: 'center',
                              borderBottom: i < failedRows.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                            }}>
                              <p style={{ fontSize: 12, color: KAI.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                {row.payee}
                              </p>
                              <p style={{ fontSize: 11, color: KAI.text4, ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                                {row.payee_key}
                              </p>
                              <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>
                                {row.latency_ms != null ? `${row.latency_ms}ms` : '—'}
                              </span>
                            </div>
                          ))}
                        </Panel>
                      </div>
                    )}
                  </section>
                )}

                {lowConfidenceMisses.length === 0 && failedRows.length === 0 && summary.total > 0 && (
                  <Panel style={{ padding: '16px 20px', borderColor: `${KAI.green}28` }}>
                    <p style={{ fontSize: 13, color: KAI.green, textAlign: 'center', margin: 0 }}>
                      ✓ 低精度・失敗ログなし — 分類品質は良好です
                    </p>
                  </Panel>
                )}

                {/* ── 8. 改善優先度ランキング ──────────────────────────── */}
                {data.payeeMissRanking.length > 0 && (
                  <section>
                    <SectionHeading hint="分類に繰り返し失敗している店舗です。キーワードルールに追加するとAPIコストを削減できます。">
                      改善すると効果が大きい店舗（失敗回数順）
                    </SectionHeading>
                    <Panel style={{ overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '28px 1fr 160px 72px 110px',
                        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.07)',
                        background: 'rgba(255,255,255,.02)',
                      }}>
                        {['優先', '店舗名', '正規化キー', '失敗回数', '最終発生日'].map((h) => (
                          <span key={h} style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em' }}>{h}</span>
                        ))}
                      </div>
                      {data.payeeMissRanking.map((row, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '28px 1fr 160px 72px 110px',
                          padding: '10px 14px', alignItems: 'center',
                          borderBottom: i < data.payeeMissRanking.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, ...MONO,
                            color: i === 0 ? KAI.danger : i < 3 ? KAI.warning : KAI.text4,
                          }}>{i + 1}</span>
                          <p style={{ fontSize: 12, color: KAI.text1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                            {row.payee}
                          </p>
                          <p style={{ fontSize: 10, color: KAI.text4, ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                            {row.payee_key}
                          </p>
                          <span style={{
                            fontSize: 12, fontWeight: 700, ...MONO,
                            color: row.count >= 5 ? KAI.danger : row.count >= 2 ? KAI.warning : KAI.text3,
                          }}>
                            {row.count}回
                          </span>
                          <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>
                            {row.last_seen.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </Panel>
                    <p style={{ fontSize: 11, color: KAI.text4, marginTop: 8, paddingLeft: 4 }}>
                      上位の店舗をキーワードルール（<code style={{ ...MONO, fontSize: 10, background: 'rgba(255,255,255,.06)', padding: '1px 4px', borderRadius: 3 }}>lib/keyword-rules.ts</code>）に追加することでコスト削減できます
                    </p>
                  </section>
                )}

                {/* ── 9. カテゴリ別 信頼度 ─────────────────────────────── */}
                {data.categoryConfidence.length > 0 && (
                  <section>
                    <SectionHeading hint="カテゴリごとのAI分類精度です。スコアが低いカテゴリは誤分類が起きやすい状態です。">
                      カテゴリ別 分類精度スコア
                    </SectionHeading>
                    <Panel style={{ overflow: 'hidden' }}>
                      {data.categoryConfidence.map((row, i) => {
                        const isGood = row.avg_confidence >= 0.85
                        const isWarn = !isGood && row.avg_confidence >= 0.65
                        return (
                          <div key={row.category_name} style={{
                            display: 'grid', gridTemplateColumns: '140px 1fr 80px 64px',
                            alignItems: 'center', gap: 12,
                            padding: '10px 16px',
                            borderBottom: i < data.categoryConfidence.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                          }}>
                            <span style={{ fontSize: 12, color: KAI.text2 }}>{row.category_name}</span>
                            <div style={{ height: 6, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${row.avg_confidence * 100}%`,
                                background: isGood ? KAI.green : isWarn ? KAI.warning : KAI.danger,
                                borderRadius: 3,
                              }}/>
                            </div>
                            <span style={{
                              fontSize: 12, ...MONO, textAlign: 'right', fontWeight: 700,
                              color: isGood ? KAI.green : isWarn ? KAI.warning : KAI.danger,
                            }}>
                              {row.avg_confidence.toFixed(3)}
                            </span>
                            <span style={{ fontSize: 11, color: KAI.text4, ...MONO, textAlign: 'right' }}>
                              {row.count}件
                            </span>
                          </div>
                        )
                      })}
                    </Panel>
                    <p style={{ fontSize: 11, color: KAI.text4, marginTop: 8, paddingLeft: 4 }}>
                      スコア 0.65未満のカテゴリはキーワードルールの追加またはカテゴリ名の見直しで改善できます
                    </p>
                  </section>
                )}

                {/* ── 10. コスト ───────────────────────────────────────── */}
                {cost && (
                  <section>
                    <SectionHeading hint="過去30日間にAI機能で発生したAPIコストです。キャッシュヒット率が高いほどコストが下がります。">
                      AIコスト（過去30日）
                    </SectionHeading>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10, marginBottom: 16 }}>
                      <StatCard
                        label="30日間の合計コスト"
                        value={`¥${cost.totalCostJpy.toLocaleString('ja-JP')}`}
                        sub={`$${cost.totalCostUsd.toFixed(4)} USD（¥150/USD換算）`}
                        color={KAI.warning}
                        description="Anthropic APIの利用料金（概算）です"
                      />
                      {Object.entries(cost.byModel).map(([model, v]) => (
                        <StatCard
                          key={model}
                          label={model.includes('haiku') ? 'Haiku（分類用）' : 'Sonnet（サマリー用）'}
                          value={`¥${Math.ceil(v.cost_usd * 150).toLocaleString('ja-JP')}`}
                          sub={`${v.calls.toLocaleString()}回 呼び出し`}
                          color={model.includes('haiku') ? KAI.coral : KAI.violet}
                        />
                      ))}
                    </div>

                    {/* 機能別コスト */}
                    {Object.keys(cost.byFeature).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: KAI.text4, marginBottom: 8, fontWeight: 600 }}>機能別コスト内訳</p>
                        <Panel style={{ overflow: 'hidden' }}>
                          {Object.entries(cost.byFeature)
                            .sort(([, a], [, b]) => b - a)
                            .map(([feature, usd], i, arr) => {
                              const pct = cost.totalCostUsd > 0 ? usd / cost.totalCostUsd : 0
                              return (
                                <div key={feature} style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: '10px 16px',
                                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                                }}>
                                  <span style={{ fontSize: 12, color: KAI.text2, width: 200, flexShrink: 0 }}>
                                    {FEATURE_LABEL[feature] ?? feature}
                                  </span>
                                  <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%', width: `${pct * 100}%`,
                                      background: feature === 'chat' || feature === 'monthly_summary' ? KAI.violet : KAI.coral,
                                      borderRadius: 3,
                                    }}/>
                                  </div>
                                  <span style={{ fontSize: 12, color: KAI.text3, ...MONO, width: 80, textAlign: 'right', flexShrink: 0 }}>
                                    ¥{Math.ceil(usd * 150).toLocaleString()}
                                  </span>
                                  <span style={{ fontSize: 11, color: KAI.text4, ...MONO, width: 44, textAlign: 'right', flexShrink: 0 }}>
                                    {(pct * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )
                            })}
                        </Panel>
                      </div>
                    )}

                    {/* 日次コストチャート */}
                    {cost.dailyCosts.length > 0 && (
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <div style={{ padding: '0 8px 10px' }}>
                          <p style={{ fontSize: 11, color: KAI.text4, fontWeight: 600, margin: 0 }}>日別コスト（¥）</p>
                          <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0' }}>コストが高い日はCSV大量取込やサマリー生成が行われた日です</p>
                        </div>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={cost.dailyCosts} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}/>
                            <YAxis tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={44}
                              tickFormatter={(v) => `¥${v}`}/>
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              formatter={(v) => [`¥${Number(v).toLocaleString()}`, 'コスト']}
                              labelStyle={{ color: KAI.text3 }}
                              itemStyle={{ color: '#f0f0f5' }}
                            />
                            <Bar dataKey="cost_jpy" name="コスト（¥）" radius={[3, 3, 0, 0]}>
                              {cost.dailyCosts.map((_, i) => <Cell key={i} fill={KAI.warning} opacity={0.7}/>)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Panel>
                    )}

                    {cost.totalCostJpy === 0 && (
                      <p style={{ textAlign: 'center', padding: '20px 0', color: KAI.text4, fontSize: 12 }}>
                        コストデータがまだ記録されていません
                      </p>
                    )}
                  </section>
                )}

                {/* ── ログなし ─────────────────────────────────────────── */}
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
          })()}
        </main>
      </div>

      <BottomBar/>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
