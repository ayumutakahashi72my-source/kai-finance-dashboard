import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { classifyByKeyword } from '@/lib/keyword-rules'
import { normalizeKeyword } from '@/lib/ai-classifier'
import goldenData from '../../../../__tests__/fixtures/category-golden.json'

export async function GET() {
  const auth = await requireAuth({ requireAdmin: true })
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  // 8クエリを並列実行 ─────────────────────────────────────────────
  const [
    { data: aggData },
    { data: dailyViewData, error: viewError },
    { data: lowConfData },
    { data: failedData },
    { data: categoryConfData },
    { data: costData },
    { data: ragStatsData },
    { data: snapshotData },
  ] = await Promise.all([
    // 1. メソッド内訳・信頼度サンプル（直近分のみ・件数はPostgREST上限に依存）
    supabase
      .from('ai_classification_logs')
      .select('method, is_cache_hit, api_calls, latency_ms, confidence, similarity')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(50000),

    // 2. 日次集計ビュー（全期間・Postgres側で集計済み → 行数制限を受けない）
    supabase
      .from('ai_classification_daily_stats')
      .select('day, total, cache_hits, exact_cache, total_api_calls, avg_latency_ms')
      .eq('household_id', householdId)
      .order('day', { ascending: true }),

    // 3. 低confidence ミス上位30件
    supabase
      .from('ai_classification_logs')
      .select('created_at, payee, payee_key, category_name, method, confidence, similarity, latency_ms')
      .eq('household_id', householdId)
      .eq('is_cache_hit', false)
      .lt('confidence', 0.7)
      .neq('method', 'failed')
      .order('confidence', { ascending: true })
      .limit(30),

    // 4. 失敗ログ（全件）
    supabase
      .from('ai_classification_logs')
      .select('created_at, payee, payee_key, latency_ms')
      .eq('household_id', householdId)
      .eq('method', 'failed')
      .order('created_at', { ascending: false })
      .limit(50000),

    // 5. カテゴリ別 confidence 集計用
    supabase
      .from('ai_classification_logs')
      .select('category_name, confidence')
      .eq('household_id', householdId)
      .not('category_name', 'is', null)
      .not('confidence', 'is', null)
      .limit(50000),

    // 6. コスト集計（過去30日）
    supabase
      .from('ai_cost_logs')
      .select('model, feature, input_tokens, output_tokens, cost_usd, created_at')
      .gte('created_at', thirtyDaysAgoIso)
      .order('created_at', { ascending: false })
      .limit(50000),

    // 7. RAG学習状況（DB側集計 — 全件転送を避けるためRPCを使用）
    supabase.rpc('get_rag_stats', { p_household_id: householdId }),

    // 8. 日次ヘルス・スナップショット（過去90日）
    supabase
      .from('ai_health_snapshots')
      .select('snapshot_date, cache_rate, llm_rate, failed_rate, total_classified, total_learned, cost_usd')
      .eq('household_id', householdId)
      .order('snapshot_date', { ascending: true })
      .limit(90),
  ])

  if (viewError) {
    return NextResponse.json({ error: viewError.message }, { status: 500 })
  }

  // ── 全体サマリー（日次集計ビューから全期間集計 → 件数制限なし） ──
  const viewRows = dailyViewData ?? []
  const total = viewRows.reduce((s, r) => s + (r.total ?? 0), 0)
  const cacheHits = viewRows.reduce((s, r) => s + (r.cache_hits ?? 0), 0)
  const hitRate = total > 0 ? cacheHits / total : 0
  const totalApiCalls = viewRows.reduce((s, r) => s + (r.total_api_calls ?? 0), 0)

  // 加重平均レイテンシ（日次ビュー avg × 件数 の総和 / 総件数）
  const latencyWeightedSum = viewRows.reduce(
    (s, r) => s + (r.avg_latency_ms ?? 0) * (r.total ?? 0),
    0,
  )
  const avgLatency = total > 0 ? Math.round(latencyWeightedSum / total) : 0

  // P95レイテンシはサンプルから計算（ビューに個別値なし）
  const aRows = aggData ?? []
  const latencies = aRows.map((r) => r.latency_ms ?? 0).filter((v) => v > 0).sort((a, b) => a - b)
  const p95Latency = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0

  // メソッド内訳（サンプルから）
  const methodCounts = aRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + 1
    return acc
  }, {})

  // 信頼度・類似度（サンプルから）
  const confidences = aRows.map((r) => Number(r.confidence ?? 0)).filter((v) => v > 0)
  const avgConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((s, v) => s + v, 0) / confidences.length) * 1000) / 1000
      : 0

  const similarities = aRows.filter((r) => r.similarity != null).map((r) => Number(r.similarity))
  const avgSimilarity =
    similarities.length > 0
      ? Math.round((similarities.reduce((s, v) => s + v, 0) / similarities.length) * 1000) / 1000
      : 0

  // ── 日次時系列（ビューから過去30日） ──────────────────────────
  const dailyStats = viewRows
    .filter((r) => new Date(String(r.day)) >= thirtyDaysAgo)
    .map((r) => ({
      day: String(r.day).slice(5, 10),
      total: r.total,
      hitRate: r.total > 0 ? Math.round(((r.cache_hits ?? 0) / r.total) * 100) / 100 : 0,
      apiCalls: r.total_api_calls,
      avgLatency: r.avg_latency_ms ?? 0,
    }))

  // ── 低confidence ミス ──────────────────────────────────────────
  const lowConfidenceMisses = (lowConfData ?? []).map((r) => ({
    created_at: r.created_at,
    payee: r.payee,
    payee_key: r.payee_key,
    category_name: r.category_name,
    method: r.method,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    similarity: r.similarity != null ? Number(r.similarity) : null,
    latency_ms: r.latency_ms,
  }))

  // ── 失敗ログ（直近20件） ───────────────────────────────────────
  const fRows = failedData ?? []
  const failedRows = fRows.slice(0, 20).map((r) => ({
    created_at: r.created_at,
    payee: r.payee,
    payee_key: r.payee_key,
    latency_ms: r.latency_ms,
  }))

  // ── payee 別頻出ミスランキング ────────────────────────────────
  const payeeMissMap = new Map<string, { payee: string; payee_key: string; count: number; last_seen: string }>()
  for (const r of fRows) {
    const existing = payeeMissMap.get(r.payee_key)
    if (existing) {
      existing.count++
      if (r.created_at > existing.last_seen) existing.last_seen = r.created_at
    } else {
      payeeMissMap.set(r.payee_key, {
        payee: r.payee,
        payee_key: r.payee_key,
        count: 1,
        last_seen: r.created_at,
      })
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

  // ── RAGキャッシュ育成曲線（週次） ─────────────────────────────
  const weeklyRagMap = new Map<string, { total: number; exactCache: number }>()
  for (const r of viewRows) {
    const d = new Date(String(r.day))
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const weekKey = monday.toISOString().slice(0, 10)
    const existing = weeklyRagMap.get(weekKey)
    if (existing) {
      existing.total += r.total
      existing.exactCache += r.exact_cache ?? 0
    } else {
      weeklyRagMap.set(weekKey, { total: r.total, exactCache: r.exact_cache ?? 0 })
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

  const regexCount = methodCounts['regex_rule'] ?? 0
  const vecCount = (methodCounts['vector_direct'] ?? 0) + (methodCounts['vector_rerank'] ?? 0)
  const llmCount = methodCounts['llm_full'] ?? 0
  const failedCount = methodCounts['failed'] ?? 0
  const corrCount = methodCounts['correction'] ?? 0

  // RETURNS TABLE なので配列の先頭行を取る（0件でも ?? 0 が効く）
  const r = Array.isArray(ragStatsData) ? ragStatsData[0] : null
  const ragStats = {
    totalLearned:   Number(r?.total_learned   ?? 0),
    highConfidence: Number(r?.high_confidence ?? 0),
    hitCountDist: {
      once:      Number(r?.dist_once       ?? 0),
      twice:     Number(r?.dist_twice      ?? 0),
      threeFour: Number(r?.dist_three_four ?? 0),
      fiveNine:  Number(r?.dist_five_nine  ?? 0),
      tenPlus:   Number(r?.dist_ten_plus   ?? 0),
    },
  }

  return NextResponse.json({
    summary: {
      total,           // 全期間累計（ビューから・件数制限なし）
      cacheHits,       // 全期間累計（ビューから）
      hitRate: Math.round(hitRate * 1000) / 1000,
      totalApiCalls,   // 全期間累計（ビューから）
      avgLatency,      // 全期間加重平均（ビューから）
      p95Latency,      // サンプルから（参考値）
      avgConfidence,   // サンプルから
      avgSimilarity,   // サンプルから
      sampleSize: aRows.length,  // メソッド内訳・信頼度のサンプル件数
    },
    methodBreakdown: methodCounts,
    dailyStats,
    lowConfidenceMisses,
    failedRows,
    payeeMissRanking,
    categoryConfidence,
    ragGrowthCurve,
    ragStats,
    healthSnapshots: (snapshotData ?? []).map((s) => ({
      date:            String(s.snapshot_date).slice(5),  // MM-DD
      cacheRate:       s.cache_rate   != null ? Number(s.cache_rate)   : null,
      llmRate:         s.llm_rate     != null ? Number(s.llm_rate)     : null,
      failedRate:      s.failed_rate  != null ? Number(s.failed_rate)  : null,
      totalClassified: s.total_classified ?? 0,
      totalLearned:    s.total_learned    ?? 0,
      costUsd:         s.cost_usd    != null ? Number(s.cost_usd)      : null,
    })),
    cost: {
      totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000,
      totalCostJpy: Math.ceil(totalCostUsd * 150),
      byModel: costByModel,
      byFeature: costByFeature,
      dailyCosts,
    },
    coverage: {
      golden: {
        total: golden.length,
        covered: goldenCovered,
        rate: Math.round((goldenCovered / (golden.length || 1)) * 1000) / 1000,
        misses: goldenMisses,
      },
      live: {
        regexRule: regexCount,
        vector: vecCount,
        llmFull: llmCount,
        failed: failedCount,
        correction: corrCount,
        regexRate: total > 0 ? Math.round((regexCount / total) * 1000) / 1000 : 0,
        llmRate: total > 0 ? Math.round((llmCount / total) * 1000) / 1000 : 0,
        failedRate: total > 0 ? Math.round((failedCount / total) * 1000) / 1000 : 0,
      },
    },
  })
}
