import type { SupabaseClient } from '@supabase/supabase-js'

export type ClassificationMethod =
  | 'correction'
  | 'regex_rule'
  | 'exact_cache'
  | 'vector_direct'
  | 'vector_rerank'
  | 'llm_full'
  | 'llm_freeform'
  | 'mf_hint'
  | 'failed'

export interface ClassificationLogEntry {
  household_id: string
  payee: string
  payee_key: string
  category_hint?: string
  category_id?: string
  category_name?: string
  method: ClassificationMethod
  confidence?: number
  similarity?: number
  latency_ms?: number
  api_calls?: number
  is_cache_hit: boolean
  error_message?: string
}

/**
 * 分類ログを ai_classification_logs テーブルに非同期書き込みする。
 * 書き込み失敗はサイレントに無視（本線の分類処理を妨げない）。
 */
export async function writeClassificationLogs(
  entries: ClassificationLogEntry[],
  supabase: SupabaseClient
): Promise<void> {
  if (!entries.length) return
  try {
    await supabase.from('ai_classification_logs').insert(entries)
  } catch {
    // ロギング失敗は本線処理に影響させない
  }
}
