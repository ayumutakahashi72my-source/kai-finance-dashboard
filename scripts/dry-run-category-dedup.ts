#!/usr/bin/env tsx
/**
 * R-1 Phase A: カテゴリ重複統合のDry Runレポート出力スクリプト。
 * dry_run_category_dedup() RPC（読み取り専用）を呼び出し、結果をJSON/CSVで出力する。
 * このスクリプトはDBを一切変更しない。Phase Bのレビュー資料として使う。
 *
 * 実行: npx tsx scripts/dry-run-category-dedup.ts
 * 出力: dedup_report_<timestamp>.json / .csv （カレントディレクトリ）
 */
import { writeFileSync } from 'fs'
import { createAdminClient } from '../lib/supabase/admin'

interface DedupRow {
  household_id: string
  category_name: string
  survivor_id: string
  survivor_created_at: string
  duplicate_ids: string[]
  duplicate_count: number
  affected_transactions: number
  affected_rag_rows: number
  affected_corrections: number
  affected_anomaly_flags: number
  affected_child_categories: number
  affected_classification_logs: number
}

function toCsv(rows: DedupRow[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => {
      const v = (row as unknown as Record<string, unknown>)[h]
      const s = Array.isArray(v) ? v.join('|') : String(v)
      return `"${s.replace(/"/g, '""')}"`
    }).join(','))
  }
  return lines.join('\n')
}

async function main() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('dry_run_category_dedup')

  if (error) {
    console.error('[dry-run-category-dedup] RPC呼び出し失敗:', error.message)
    process.exitCode = 1
    return
  }

  const rows = (data ?? []) as DedupRow[]
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const jsonPath = `dedup_report_${ts}.json`
  const csvPath = `dedup_report_${ts}.csv`

  writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8')
  writeFileSync(csvPath, toCsv(rows), 'utf-8')

  const totals = rows.reduce((acc, r) => ({
    duplicateCategories: acc.duplicateCategories + r.duplicate_count,
    transactions: acc.transactions + Number(r.affected_transactions),
    ragRows: acc.ragRows + Number(r.affected_rag_rows),
    corrections: acc.corrections + Number(r.affected_corrections),
    anomalyFlags: acc.anomalyFlags + Number(r.affected_anomaly_flags),
    childCategories: acc.childCategories + Number(r.affected_child_categories),
    classificationLogs: acc.classificationLogs + Number(r.affected_classification_logs),
  }), {
    duplicateCategories: 0, transactions: 0, ragRows: 0, corrections: 0,
    anomalyFlags: 0, childCategories: 0, classificationLogs: 0,
  })

  console.log(`重複グループ: ${rows.length}件 / 削除予定カテゴリ数: ${totals.duplicateCategories}件`)
  console.log(`影響見込み: transactions=${totals.transactions} / category_rag=${totals.ragRows} / ` +
    `corrections=${totals.corrections} / anomaly_flags=${totals.anomalyFlags} / ` +
    `child_categories=${totals.childCategories} / classification_logs=${totals.classificationLogs}`)
  console.log(`レポート出力: ${jsonPath}, ${csvPath}`)
}

main().catch((err) => {
  console.error('[dry-run-category-dedup] 致命的エラー:', err)
  process.exitCode = 1
})
