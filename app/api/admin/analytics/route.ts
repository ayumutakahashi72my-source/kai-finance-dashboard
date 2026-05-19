import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { classifyByKeyword } from '@/lib/keyword-rules'
import { normalizeKeyword } from '@/lib/ai-classifier'
import goldenData from '../../../../__tests__/fixtures/category-golden.json'

export async function GET() {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase } = auth

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  // 6クエリを並列実行 ─────────────────────────────────────────────
  const [
    { data: aggData, error: aggError },
    { data: dailyViewData },
    { data: lowConfData },
    { data: failedData },
    { data: categoryConfData },
    { data: costData },
  ] = await Promise.all([
    // 1. 全件集計用（軽量カラムのみ・limit なし）
    supabase
      .from('ai_classification_logs')
      .select('method, is_cache_hit, api_calls, latency_ms, confidence, similarity'),

    // 2. 日次集計ビュー（Postgres側で集計済み・全期間）
    supabase
      .from('ai_classification_daily_stats')
      .select('day, total, cache_hits, exact_cache, total_api_calls, avg_latency_ms')
      .order('day', { ascending: true }),

    // 3. 低confidence ミス上位30件
    supabase
      .from('ai_classification_logs')
      .select('created_at, payee, payee_key, category_name, method, confidence, similarity, latency_ms')
      .eq('is_cache_hit', false)
      .lt('confidence', 0.7)
      .neq('method', 'failed')
      .order('confidence', { ascending: true })
      .limit(30),

    // 4. 失敗ログ（failedRows + payeeMissRanking 兼用・limit なし）
    supabase
      .from('ai_classification_logs')
      .select('created_at, payee, payee_key, latency_ms')
      .eq('method', 'failed')
      .order('created_at', { ascending: false }),

    // 5. カテゴリ別 confidence 集計用
    supabase
      .from('ai_classification_logs')
      .select('category_name, confidence')
      .not('category_name', 'is', null)
      .not('confidence', 'is', null),

    // 6. コスト集計（過去30日）
    supabase
      .from('ai_cost_logs')
      .select('model, feature, input_tokens, output_tokens, cost_usd, created_at')
      .gte('created_at', thirtyDaysAgoIso)
      .order('created_at', { ascending: false })
      .limit(10000),
  ])

  if (aggError) {
    return NextResponse.json({ error: aggError.message }, { status: 500 })
  }

  // ── 全体サマリー ────────────────────────────────────────────────
  const aRows = aggData ?? []
  const total = aRows.length
  const cacheHits = aRows.filter((r) => r.is_cache_hit).length
  const hitRate = total > 0 ? cacheHits / total : 0

  const methodCounts = aRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + 1
    return acc
  }, {})

  const totalApiCalls = aRows.reduce((s, r) => s + (r.api_calls ?? 0), 0)

  const latencies = aRows.map((r) => r.latency_ms ?? 0).filter((v) => v > 0).sort((a, b) => a - b)
  const avgLatency = latencies.length > 0
    ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
    : 0
  const p95Latency = latencies.length > 0
    ? latencies[Math.floor(latencies.length * 0.95)]
    : 0

  const confidences = aRows.map((r) => Number(r.confidence ?? 0)).filter((v) => v > 0)
  const avgConfidence = confidences.length > 0
    ? Math.round((confidences.reduce((s, v) => s + v, 0) / confidences.length) * 1000) / 1000
    : 0

  const similarities = aRows.filter((r) => r.similarity != null).map((r) => Number(r.similarity))
  const avgSimilarity = similarities.length > 0
    ? Math.round((similarities.reduce((s, v) => s + v, 0) / similarities.length) * 1000) / 1000
    : 0

  // ── 日次時系列（ビューから過去30日） ──────────────────────────
  const dailyStats = (dailyViewData ?? [])
    .filter((r) => new Date(String(r.day)) >= thirtyDaysAgo)
    .map((r) => ({
      day:        String(r.day).slice(5, 10),  // MM-DD
      total:      r.total,
      hitRate:    r.total > 0 ? Math.round((r.cache_hits / r.total) * 100) / 100 : 0,
      apiCalls:   r.total_api_calls,
      avgLatency: r.avg_latency_ms ?? 0,
    }))

  // ── 低confidence ミス上位 ──────────────────────────────────────
  const lowConfidenceMisses = (lowConfData ?? []).map((r) => ({
    created_at:    r.created_at,
    payee:         r.payee,
    payee_key:     r.payee_key,
    category_name: r.category_name,
    method:        r.method,
    confidence:    r.confidence != null ? Number(r.confidence) : null,
    similarity:    r.similarity != null ? Number(r.similarity) : null,
    latency_ms:    r.latency_ms,
  }))

  // ── 失敗ログ（直近20件） ───────────────────────────────────────
  const fRows = failedData ?? []
  const failedRows = fRows.slice(0, 20).map((r) => ({
    created_at: r.created_at,
    payee:      r.payee,
    payee_key:  r.payee_key,
    latency_ms: r.latency_ms,
  }))

  // ── payee 別頻出ミスランキング（全期間） ──────────────────────
  const payeeMissMap = new Map<string, { payee: string; payee_key: string; count: number; last_seen: string }>()
  for (const r of fRows) {
    const existing = payeeMissMap.get(r.payee_key)
    if (existing) {
      existing.count++
      if (r.created_at > existing.last_seen) existing.last_seen = r.created_at
    } else {
      payeeMissMap.set(r.payee_key, { payee: r.payee, payee_key: r.payee_key, count: 1, last_seen: r.created_at })
    }
  }
  const payeeMissRanking = Array.from(payeeMissMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // ── カテゴリ別 平均 confidence ────────────────────────────────
  const categoryConfMap = new Map<string, { sum: number; count: number }>()
  for (const r of categoryConfData ?? []) {
    const name = r.category_name!
    const existing = categoryConfMap.get(name)
    if (existing) {
      existing.sum += Number(r.confidence)
      existing.count++
    } else {
      categoryConfMap.set(name, { sum: Number(r.confidence), count: 1 })
    }
  }
  const categoryConfidence = Array.from(categoryConfMap.entries())
    .map(([category_name, { sum, count }]) => ({
      category_name,
      avg_confidence: Math.round((sum / count) * 1000) / 1000,
      count,
    }))
    .sort((a, b) => a.avg_confidence - b.avg_confidence)

  // ── RAGキャッシュ育成曲線（週次・ビューから全期間） ──────────
  const weeklyRagMap = new Map<string, { total: number; exactCache: number }>()
  for (const r of dailyViewData ?? []) {
    const d = new Date(String(r.day))
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const weekKey = monday.toISOString().slice(0, 10)
    const existing = weeklyRagMap.get(weekKey)
    if (existing) {
      existing.total      += r.total
      existing.exactCache += r.exact_cache
    } else {
      weeklyRagMap.set(weekKey, { total: r.total, exactCache: r.exact_cache })
    }
  }
  const ragGrowthCurve = Array.from(weeklyRagMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, { total, exactCache }]) => ({
      week,
      total,
      exactCache,
      exactCacheRate: total > 0 ? Math.round((exactCache / total) * 1000) / 1000 : 0,
    }))

  // ── コスト集計 ────────────────────────────────────────────────
  const cRows = costData ?? []

  const costByModel = cRows.reduce<Record<string, { calls: number; cost_usd: number }>>((acc, r) => {
    if (!acc[r.model]) acc[r.model] = { calls: 0, cost_usd: 0 }
    acc[r.model].calls++
    acc[r.model].cost_usd += Number(r.cost_usd)
    return acc
  }, {})

  const costByFeature = cRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.feature] = (acc[r.feature] ?? 0) + Number(r.cost_usd)
    return acc
  }, {})

  const dailyCostMap = new Map<string, number>()
  for (const r of cRows) {
    const day = r.created_at.slice(5, 10)
    dailyCostMap.set(day, (dailyCostMap.get(day) ?? 0) + Number(r.cost_usd))
  }
  const dailyCosts = Array.from(dailyCostMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, cost_usd]) => ({
      day,
      cost_usd: Math.round(cost_usd * 1_000_000) / 1_000_000,
      cost_jpy: Math.ceil(cost_usd * 150),
    }))

  const totalCostUsd = cRows.reduce((s, r) => s + Number(r.cost_usd), 0)

  // ── キーワードルール カバレッジ（golden dataset） ──────────────
  type GoldenEntry = { text: string; expected: string }
  const golden = goldenData as GoldenEntry[]
  let goldenCovered = 0
  const goldenMisses: string[] = []
  for (const entry of golden) {
    if (classifyByKeyword(normalizeKeyword(entry.text)) !== null) {
      goldenCovered++
    } else {
      goldenMisses.push(entry.text)
    }
  }

  const regexCount  = methodCounts['regex_rule']   ?? 0
  const vecCount    = (methodCounts['vector_direct'] ?? 0) + (methodCounts['vector_rerank'] ?? 0)
  const llmCount    = methodCounts['llm_full']      ?? 0
  const failedCount = methodCounts['failed']        ?? 0
  const corrCount   = methodCounts['correction']    ?? 0

  return NextResponse.json({
    summary: {
      total,
      cacheHits,
      hitRate:       Math.round(hitRate * 1000) / 1000,
      totalApiCalls,
      avgLatency,
      p95Latency,
      avgConfidence,
      avgSimilarity,
    },
    methodBreakdown: methodCounts,
    dailyStats,
    lowConfidenceMisses,
    failedRows,
    payeeMissRanking,
    categoryConfidence,
    ragGrowthCurve,
    cost: {
      totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      totalCostJpy: Math.ceil(totalCostUsd * 150),
      byModel:      costByModel,
      byFeature:    costByFeature,
      dailyCosts,
    },
    coverage: {
      golden: {
        total:   golden.length,
        covered: goldenCovered,
        rate:    Math.round((goldenCovered / (golden.length || 1)) * 1000) / 1000,
        misses:  goldenMisses,
      },
      live: {
        regexRule:  regexCount,
        vector:     vecCount,
        llmFull:    llmCount,
        failed:     failedCount,
        correction: corrCount,
        regexRate:  total > 0 ? Math.round((regexCount  / total) * 1000) / 1000 : 0,
        llmRate:    total > 0 ? Math.round((llmCount    / total) * 1000) / 1000 : 0,
        failedRate: total > 0 ? Math.round((failedCount / total) * 1000) / 1000 : 0,
      },
    },
  })
}
