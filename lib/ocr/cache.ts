import type { SupabaseClient } from '@supabase/supabase-js'

export interface CacheHints {
  canonicalChain?: string
  phone?: string
  zipcode?: string
  layoutHash?: string
  lastOcrEngine?: string
  totalKeyword?: string
}

export interface CacheRecord {
  payee: string
  canonicalChain: string
  hints: CacheHints
  confidence: number
}

const CACHE_HIT_DELTA   = 0.03
const MIN_WRITE_CONF    = 0.82

export async function lookupStoreCache(
  storeKey: string,
  householdId: string,
  supabase: SupabaseClient,
): Promise<CacheRecord | null> {
  const { data } = await supabase
    .from('ocr_store_cache')
    .select('payee, hints, confidence, hit_count')
    .eq('household_id', householdId)
    .eq('store_key', storeKey)
    .maybeSingle()

  if (!data) return null

  // hit_count / confidence 更新 (non-blocking, race は許容)
  supabase
    .from('ocr_store_cache')
    .update({
      hit_count: (data.hit_count as number) + 1,
      confidence: Math.min(0.99, (data.confidence as number) + CACHE_HIT_DELTA),
      last_seen: new Date(Date.now() + 9 * 3600_000).toISOString().split('T')[0],
    })
    .eq('household_id', householdId)
    .eq('store_key', storeKey)
    .then(() => {}, () => {})

  const hints = (data.hints ?? {}) as CacheHints
  return {
    payee:          data.payee as string,
    canonicalChain: hints.canonicalChain ?? (data.payee as string),
    hints,
    confidence:     data.confidence as number,
  }
}

export async function writeStoreCache(
  storeKey: string,
  payee: string,
  canonicalChain: string,
  hints: CacheHints,
  confidence: number,
  householdId: string,
  supabase: SupabaseClient,
): Promise<void> {
  if (confidence < MIN_WRITE_CONF) return

  const today = new Date(Date.now() + 9 * 3600_000).toISOString().split('T')[0]

  // atomic upsert via RPC: GREATEST(old, new) で低品質上書きを防止
  const { error } = await supabase.rpc('ocr_cache_upsert', {
    p_household_id: householdId,
    p_store_key:    storeKey,
    p_payee:        payee,
    p_hints:        { ...hints, canonicalChain },
    p_confidence:   confidence,
    p_last_seen:    today,
  })

  if (error) {
    console.warn('[OCR cache] upsert RPC failed, fallback to JS upsert:', error.message)
    // フォールバック: RPC 未適用環境向け (migration 前)
    await supabase
      .from('ocr_store_cache')
      .upsert(
        {
          household_id: householdId,
          store_key:    storeKey,
          payee,
          hints:        { ...hints, canonicalChain },
          confidence,
          last_seen:    today,
        },
        { onConflict: 'household_id,store_key', ignoreDuplicates: false },
      )
  }
}
