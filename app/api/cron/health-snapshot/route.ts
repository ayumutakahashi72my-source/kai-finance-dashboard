/**
 * Vercel Cron: 日次ヘルス・スナップショット記録
 * Schedule: 毎日 04:00 JST (UTC 19:00) → vercel.json: "0 19 * * *"
 *
 * 処理内容:
 * ① 全世帯ループ
 * ② 前日の分類統計を ai_classification_daily_stats ビューから集計
 * ③ ai_cost_logs から前日コストを集計
 * ④ get_rag_stats RPC で学習状況を取得
 * ⑤ ai_health_snapshots に UPSERT
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const yesterday = new Date()
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const snapshotDate = yesterday.toISOString().slice(0, 10)

  // 対象世帯を全件取得
  const { data: households } = await supabase.from('households').select('id')
  if (!households?.length) {
    return NextResponse.json({ message: '世帯なし', date: snapshotDate })
  }

  const results: Array<{ householdId: string; status: string }> = []

  for (const { id: hid } of households) {
    try {
      // ① 前日の分類統計（daily_stats ビューから1行取得）
      const { data: dayRow } = await supabase
        .from('ai_classification_daily_stats')
        .select('total, cache_hits, exact_cache, llm_full, failed, total_api_calls')
        .eq('household_id', hid)
        .eq('day', `${snapshotDate}T00:00:00`)
        .maybeSingle()

      const total = dayRow?.total ?? 0
      const cacheHits = (dayRow?.cache_hits ?? 0)
      const llmFull  = dayRow?.llm_full ?? 0
      const failed   = dayRow?.failed ?? 0

      // ② 前日コスト集計
      const { data: costRows } = await supabase
        .from('ai_cost_logs')
        .select('cost_usd')
        .eq('household_id', hid)
        .gte('created_at', `${snapshotDate}T00:00:00.000Z`)
        .lt( 'created_at', `${snapshotDate}T23:59:59.999Z`)

      const costUsd = (costRows ?? []).reduce((s, r) => s + Number(r.cost_usd), 0)

      // ③ 学習状況（RPC）
      const { data: ragData } = await supabase
        .rpc('get_rag_stats', { p_household_id: hid })

      const ragRow = Array.isArray(ragData) ? ragData[0] : null

      // ④ UPSERT
      await supabase.from('ai_health_snapshots').upsert({
        household_id:     hid,
        snapshot_date:    snapshotDate,
        cache_rate:       total > 0 ? Math.round(cacheHits / total * 10000) / 10000 : null,
        llm_rate:         total > 0 ? Math.round(llmFull   / total * 10000) / 10000 : null,
        failed_rate:      total > 0 ? Math.round(failed     / total * 10000) / 10000 : null,
        total_classified: total,
        total_learned:    Number(ragRow?.total_learned   ?? 0),
        high_conf_count:  Number(ragRow?.high_confidence ?? 0),
        cost_usd:         Math.round(costUsd * 1_000_000) / 1_000_000,
      }, { onConflict: 'household_id,snapshot_date' })

      results.push({ householdId: hid, status: 'ok' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ householdId: hid, status: `error: ${msg}` })
    }
  }

  return NextResponse.json({ date: snapshotDate, results })
}
