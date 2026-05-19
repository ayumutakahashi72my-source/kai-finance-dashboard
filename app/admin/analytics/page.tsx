'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
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
}

const METHOD_COLORS: Record<string, string> = {
  correction:    KAI.violet,
  regex_rule:    KAI.green,
  exact_cache:   KAI.success,
  vector_direct: KAI.info,
  vector_rerank: KAI.warning,
  llm_full:      KAI.coral,
  llm_freeform:  KAI.orange,
  failed:        KAI.danger,
}

const FEATURE_LABEL: Record<string, string> = {
  classification:  '分類（Haiku）',
  chat:            'AIチャット（Sonnet）',
  monthly_summary: '月次サマリー（Sonnet）',
  budget_suggest:  '予算提案（Haiku）',
  spending_pattern:'支出分析（Haiku）',
}

// ── small components ──────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 11, fontWeight: 700, color: KAI.text4,
      letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12,
    }}>
      {children}
    </h2>
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

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <Panel style={{ padding: '14px 18px' }}>
      <p style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 800, color: color ?? KAI.text1, ...MONO, marginTop: 5, letterSpacing: '-.02em' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: KAI.text4, marginTop: 3 }}>{sub}</p>}
    </Panel>
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

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a14', color: KAI.text1 }}>
      {/* background grain */}
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
            const { summary, methodBreakdown, dailyStats, lowConfidenceMisses, failedRows, cost, coverage } = data
            const methodEntries = Object.entries(methodBreakdown).sort(([, a], [, b]) => b - a)

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

                {/* サマリーカード */}
                <section>
                  <SectionHeading>サマリー（直近10,000件）</SectionHeading>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                    <StatCard
                      label="総分類数"
                      value={summary.total.toLocaleString('ja-JP')}
                    />
                    <StatCard
                      label="キャッシュヒット率"
                      value={`${(summary.hitRate * 100).toFixed(1)}%`}
                      sub={`${summary.cacheHits.toLocaleString()} / ${summary.total.toLocaleString()} 件`}
                      color={summary.hitRate >= 0.7 ? KAI.green : summary.hitRate >= 0.4 ? KAI.warning : KAI.danger}
                    />
                    <StatCard
                      label="API 呼び出し"
                      value={summary.totalApiCalls.toLocaleString('ja-JP')}
                      sub="累計 Anthropic calls"
                      color={KAI.coral}
                    />
                    <StatCard
                      label="平均レイテンシ"
                      value={`${summary.avgLatency}ms`}
                      sub={`P95: ${summary.p95Latency}ms`}
                      color={summary.avgLatency < 1000 ? KAI.green : summary.avgLatency < 3000 ? KAI.warning : KAI.danger}
                    />
                    <StatCard
                      label="平均信頼度"
                      value={summary.avgConfidence > 0 ? summary.avgConfidence.toFixed(3) : 'N/A'}
                      sub="全経路（0–1）"
                      color={summary.avgConfidence >= 0.85 ? KAI.green : KAI.warning}
                    />
                    <StatCard
                      label="平均類似度"
                      value={summary.avgSimilarity > 0 ? summary.avgSimilarity.toFixed(3) : 'N/A'}
                      sub="vector 経路のみ"
                      color={KAI.info}
                    />
                  </div>
                </section>

                {/* 分類メソッド内訳 */}
                <section>
                  <SectionHeading>分類メソッド内訳</SectionHeading>
                  <Panel style={{ overflow: 'hidden' }}>
                    {methodEntries.length === 0 && (
                      <p style={{ padding: '20px', fontSize: 12, color: KAI.text4 }}>データなし</p>
                    )}
                    {methodEntries.map(([method, count], i) => {
                      const pct = summary.total > 0 ? count / summary.total : 0
                      return (
                        <div key={method} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px',
                          borderBottom: i < methodEntries.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                            background: METHOD_COLORS[method] ?? '#8b8ba0',
                          }}/>
                          <span style={{ fontSize: 12, color: KAI.text2, width: 140, flexShrink: 0, ...MONO }}>
                            {method}
                          </span>
                          <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${pct * 100}%`,
                              background: METHOD_COLORS[method] ?? '#8b8ba0',
                              borderRadius: 3,
                            }}/>
                          </div>
                          <span style={{ fontSize: 12, color: KAI.text3, ...MONO, width: 72, textAlign: 'right', flexShrink: 0 }}>
                            {count.toLocaleString()}件
                          </span>
                          <span style={{ fontSize: 11, color: KAI.text4, ...MONO, width: 44, textAlign: 'right', flexShrink: 0 }}>
                            {(pct * 100).toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                  </Panel>
                </section>

                {/* カバレッジ */}
                <section>
                  <SectionHeading>パイプライン カバレッジ</SectionHeading>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Golden dataset */}
                    <Panel style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.12em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>
                        Golden Dataset
                      </p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                        <span style={{
                          fontSize: 30, fontWeight: 800, ...MONO, letterSpacing: '-.02em',
                          color: coverage.golden.rate >= 0.9 ? KAI.green : KAI.warning,
                        }}>
                          {(coverage.golden.rate * 100).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 12, color: KAI.text4 }}>
                          {coverage.golden.covered}/{coverage.golden.total}件
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{
                          height: '100%', width: `${coverage.golden.rate * 100}%`,
                          background: coverage.golden.rate >= 0.9 ? KAI.green : KAI.warning,
                          borderRadius: 3,
                        }}/>
                      </div>
                      {coverage.golden.misses.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, color: KAI.text4, marginBottom: 6 }}>
                            未カバー ({coverage.golden.misses.length}件)
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
                              <span style={{ fontSize: 10, color: KAI.text4 }}>
                                +{coverage.golden.misses.length - 10}件
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {coverage.golden.misses.length === 0 && (
                        <p style={{ fontSize: 11, color: KAI.green }}>
                          ✓ 全件カバー済み
                        </p>
                      )}
                    </Panel>

                    {/* Live pipeline */}
                    <Panel style={{ padding: '16px 20px' }}>
                      <p style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.12em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
                        Live パイプライン段階
                      </p>
                      {[
                        { label: '① Regex rule', count: coverage.live.regexRule,  color: KAI.green   },
                        { label: '② Vector',     count: coverage.live.vector,     color: KAI.info    },
                        { label: '③ LLM full',   count: coverage.live.llmFull,    color: KAI.coral   },
                        { label: '✓ Correction', count: coverage.live.correction, color: KAI.violet  },
                        { label: '✗ Failed',     count: coverage.live.failed,     color: KAI.danger  },
                      ].map(({ label, count, color }) => {
                        const pct = summary.total > 0 ? count / summary.total : 0
                        return (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: KAI.text3, width: 96, flexShrink: 0, ...MONO }}>
                              {label}
                            </span>
                            <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct * 100}%`, background: color, borderRadius: 3 }}/>
                            </div>
                            <span style={{ fontSize: 11, color: KAI.text4, ...MONO, width: 54, textAlign: 'right', flexShrink: 0 }}>
                              {count > 0 ? `${(pct * 100).toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        )
                      })}
                      {summary.total === 0 && (
                        <p style={{ fontSize: 12, color: KAI.text4, marginTop: 8 }}>
                          ログがまだありません
                        </p>
                      )}
                    </Panel>
                  </div>
                </section>

                {/* 日次チャート */}
                {dailyStats.length > 0 && (
                  <section>
                    <SectionHeading>日次トレンド（過去30日）</SectionHeading>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {/* ヒット率 */}
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <p style={{ fontSize: 11, color: KAI.text4, padding: '0 8px 10px', fontWeight: 600 }}>
                          キャッシュヒット率
                        </p>
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
                              formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, 'ヒット率']}
                              labelStyle={{ color: KAI.text3 }}
                            />
                            <Line type="monotone" dataKey="hitRate" stroke={KAI.violet} strokeWidth={2} dot={false}/>
                          </LineChart>
                        </ResponsiveContainer>
                      </Panel>

                      {/* API呼び出し */}
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <p style={{ fontSize: 11, color: KAI.text4, padding: '0 8px 10px', fontWeight: 600 }}>
                          API 呼び出し数
                        </p>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={dailyStats} margin={{ left: 0, right: 12 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false}/>
                            <YAxis tick={{ fontSize: 9, fill: KAI.text4 }} tickLine={false} width={32}/>
                            <Tooltip
                              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, fontSize: 11 }}
                              labelStyle={{ color: KAI.text3 }}
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

                {/* 低信頼度ミス */}
                {lowConfidenceMisses.length > 0 && (
                  <section>
                    <SectionHeading>
                      低信頼度ミス（confidence &lt; 0.7）— {lowConfidenceMisses.length}件
                    </SectionHeading>
                    <Panel style={{ overflow: 'hidden' }}>
                      {/* ヘッダー行 */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 160px 100px 72px 72px 72px',
                        padding: '8px 14px',
                        borderBottom: '1px solid rgba(255,255,255,.07)',
                        background: 'rgba(255,255,255,.02)',
                      }}>
                        {['支払先', 'カテゴリ', 'メソッド', '信頼度', '類似度', '遅延'].map((h) => (
                          <span key={h} style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                      {lowConfidenceMisses.map((row, i) => (
                        <div key={i} style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 160px 100px 72px 72px 72px',
                          padding: '9px 14px', alignItems: 'center',
                          borderBottom: i < lowConfidenceMisses.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 12, color: KAI.text1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.payee}
                            </p>
                            <p style={{ fontSize: 10, color: KAI.text4, ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.payee_key}
                            </p>
                          </div>
                          <span style={{ fontSize: 11, color: KAI.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.category_name ?? '—'}
                          </span>
                          <span style={{ fontSize: 11, color: METHOD_COLORS[row.method] ?? KAI.text3, ...MONO }}>
                            {row.method}
                          </span>
                          <span style={{
                            fontSize: 11, ...MONO,
                            color: row.confidence != null && row.confidence < 0.5 ? KAI.danger : KAI.warning,
                          }}>
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
                  </section>
                )}

                {lowConfidenceMisses.length === 0 && summary.total > 0 && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: KAI.green }}>
                    ✓ 低信頼度ミスなし — 分類品質は良好です
                  </p>
                )}

                {/* 失敗ログ */}
                {failedRows.length > 0 && (
                  <section>
                    <SectionHeading>
                      分類失敗ログ — {failedRows.length}件
                    </SectionHeading>
                    <Panel style={{ overflow: 'hidden' }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 160px 72px',
                        padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,.07)',
                        background: 'rgba(255,255,255,.02)',
                      }}>
                        {['支払先', '正規化キー', '遅延'].map((h) => (
                          <span key={h} style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            {h}
                          </span>
                        ))}
                      </div>
                      {failedRows.map((row, i) => (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '1fr 160px 72px',
                          padding: '9px 14px', alignItems: 'center',
                          borderBottom: i < failedRows.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                        }}>
                          <p style={{ fontSize: 12, color: KAI.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.payee}
                          </p>
                          <p style={{ fontSize: 11, color: KAI.text4, ...MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.payee_key}
                          </p>
                          <span style={{ fontSize: 11, color: KAI.text4, ...MONO }}>
                            {row.latency_ms != null ? `${row.latency_ms}ms` : '—'}
                          </span>
                        </div>
                      ))}
                    </Panel>
                  </section>
                )}

                {/* コスト */}
                {cost && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <SectionHeading>AIコスト（過去30日）</SectionHeading>
                      <span style={{
                        fontSize: 10, color: KAI.warning, fontWeight: 700,
                        background: `${KAI.warning}18`, border: `1px solid ${KAI.warning}28`,
                        borderRadius: 5, padding: '1px 7px', letterSpacing: '.04em',
                        marginBottom: 12, flexShrink: 0,
                      }}>
                        ¥150/USD
                      </span>
                    </div>

                    {/* コストサマリーカード */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                      <StatCard
                        label="累計コスト（30日）"
                        value={`¥${cost.totalCostJpy.toLocaleString('ja-JP')}`}
                        sub={`$${cost.totalCostUsd.toFixed(4)} USD`}
                        color={KAI.warning}
                      />
                      {Object.entries(cost.byModel).map(([model, v]) => (
                        <StatCard
                          key={model}
                          label={model.includes('haiku') ? 'Haiku（分類）' : 'Sonnet（サマリー）'}
                          value={`¥${Math.ceil(v.cost_usd * 150).toLocaleString('ja-JP')}`}
                          sub={`${v.calls.toLocaleString()}回`}
                          color={model.includes('haiku') ? KAI.coral : KAI.violet}
                        />
                      ))}
                    </div>

                    {/* フィーチャー別 */}
                    {Object.keys(cost.byFeature).length > 0 && (
                      <Panel style={{ overflow: 'hidden', marginBottom: 16 }}>
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
                    )}

                    {/* 日次コスト */}
                    {cost.dailyCosts.length > 0 && (
                      <Panel style={{ padding: '16px 8px 8px' }}>
                        <p style={{ fontSize: 11, color: KAI.text4, padding: '0 8px 10px', fontWeight: 600 }}>
                          日次コスト（¥）
                        </p>
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

                {/* ログなし */}
                {summary.total === 0 && (
                  <Panel style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: KAI.text3, fontWeight: 600, marginBottom: 8 }}>
                      分類ログがまだありません
                    </p>
                    <p style={{ fontSize: 12, color: KAI.text4, lineHeight: 1.7 }}>
                      CSV取り込みまたはMF自動取得を実行すると記録されます
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
