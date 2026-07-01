import type { SupabaseClient } from '@supabase/supabase-js'

export type ClassificationMethod =
  | 'correction'
  | 'regex_rule'
  | 'regex_miss'
  | 'exact_cache'
  | 'vector_direct'
  | 'vector_rerank'
  | 'llm_full'
  | 'llm_freeform'
  | 'llm_force'
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
  error_stack?: string
}

/** Error から error_message / error_stack ペアを組み立てる（stack は2000文字に切り詰め） */
export function errorLogFields(err: unknown): { error_message: string; error_stack?: string } {
  if (err instanceof Error) {
    return { error_message: err.message, error_stack: err.stack?.slice(0, 2000) }
  }
  return { error_message: String(err) }
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
