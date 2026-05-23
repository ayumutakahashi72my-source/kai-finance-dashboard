import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeOCRBlocks } from './normalize'
import { detectMerchant } from './merchant'
import { extractAmount } from './amount'
import { extractDate } from './date'
import { buildFingerprint } from './fingerprint'
import { lookupStoreCache, writeStoreCache } from './cache'
import { applyAIFallback } from './ai-fallback'
import { todayJST } from './jst'
import { normalizeKeyword } from '@/lib/ai-classifier'
import type { OCRBlock, OcrResult, OcrTimings } from './types'

// ── Observability ─────────────────────────────────────────────────
// 将来 api_error_logs や専用テーブルに差し替えられる構造
interface OcrMetrics {
  merchantConfidence: number
  amountConfidence:   number
  dateConfidence:     number
  cacheHit:           boolean
  aiUsed:             boolean
  timings:            OcrTimings
}

function logOcrMetrics(metrics: OcrMetrics): void {
  console.log('[OCR metrics]', JSON.stringify(metrics))
}

// ── Embedding fallback stub ───────────────────────────────────────
// 条件: cache miss AND merchant confidence が borderline (0.45-0.65) AND
//       意味的に近い候補が embedding 検索で見つかる場合のみ呼ぶ。
// TODO: ocr_store_cache に embedding カラムが追加されたら実装。
// NOTE: 現時点では embedding fallback なし (コスト・レイテンシ抑制)。
async function applyEmbeddingFallback(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _merchant: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _householdId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _supabase: SupabaseClient,
): Promise<string | null> {
  // stub: null を返せば AI fallback に委譲される
  return null
}

// ── Main pipeline ─────────────────────────────────────────────────
export async function structureReceiptData({
  blocks: rawBlocks,
  householdId,
  supabase,
}: {
  blocks:      OCRBlock[]
  householdId: string
  supabase:    SupabaseClient
}): Promise<OcrResult & { timings: Omit<OcrTimings, 'ocr_ms'> }> {
  const today = todayJST()
  const t0    = Date.now()

  // ① Normalize
  const t1         = Date.now()
  const blocks     = normalizeOCRBlocks(rawBlocks)
  const normalize_ms = Date.now() - t1
  console.log(`[OCR] raw=${rawBlocks.length} normalized=${blocks.length}`)

  // ② Heuristic extraction
  const t2             = Date.now()
  const merchantResult = detectMerchant(blocks)
  const amountResult   = extractAmount(blocks)
  const dateResult     = extractDate(blocks)
  const merchant_ms    = Date.now() - t2
  console.log(
    `[OCR] merchant="${merchantResult.merchant}"(${merchantResult.confidence.toFixed(2)})` +
    ` amount=${amountResult.amount}(${amountResult.confidence.toFixed(2)})` +
    ` date=${dateResult.date}(${dateResult.confidence.toFixed(2)})`
  )

  // ③ Store cache (exact match)
  const t3       = Date.now()
  const normKey  = normalizeKeyword(merchantResult.canonicalChain || merchantResult.merchant)
  const fp       = buildFingerprint(normKey, blocks)
  // merchant / phone / zip のいずれかがないと storeKey が定数になり世帯内で衝突する
  const hasCacheSignal = normKey.length >= 3 || fp.phone !== undefined || fp.zipcode !== undefined
  const cached   = hasCacheSignal
    ? await lookupStoreCache(fp.storeKey, householdId, supabase).catch(() => null)
    : null
  const embedding_ms = Date.now() - t3

  if (cached && cached.confidence >= 0.80) {
    console.log(`[OCR] cache hit: "${cached.payee}"`)
    const timings: Omit<OcrTimings, 'ocr_ms'> = {
      normalize_ms, merchant_ms, embedding_ms, ai_ms: 0, total_ms: Date.now() - t0,
    }
    logOcrMetrics({ merchantConfidence: merchantResult.confidence, amountConfidence: amountResult.confidence, dateConfidence: dateResult.confidence, cacheHit: true, aiUsed: false, timings: { ocr_ms: 0, ...timings } })
    return {
      payee:       cached.payee,
      amount:      amountResult.amount,
      occurred_on: dateResult.date,
      confidence:  Math.max(cached.confidence, amountResult.confidence),
      timings,
    }
  }

  // ④ Embedding fallback (stub: borderline merchant confidence のみ)
  const borderlineMerchant =
    merchantResult.confidence >= 0.45 && merchantResult.confidence < 0.65

  if (borderlineMerchant) {
    const embeddingMatch = await applyEmbeddingFallback(
      merchantResult.canonicalChain || merchantResult.merchant,
      householdId,
      supabase,
    ).catch(() => null)
    if (embeddingMatch) {
      merchantResult.merchant       = embeddingMatch
      merchantResult.canonicalChain = embeddingMatch
      merchantResult.confidence     = 0.72
    }
  }

  // ⑤ AI fallback (heuristics が弱い場合のみ)
  const needsAI = (
    merchantResult.confidence < 0.65 ||
    amountResult.confidence   < 0.60 ||
    dateResult.confidence     < 0.50
  )

  let ai_ms = 0
  let result: OcrResult & { canonicalChain?: string }

  if (needsAI) {
    const t4 = Date.now()
    try {
      result = await applyAIFallback(blocks, {
        payee:       merchantResult.merchant     || undefined,
        amount:      amountResult.amount         || undefined,
        occurred_on: dateResult.confidence > 0.5 ? dateResult.date : undefined,
      })
      console.log(`[OCR] AI fallback ok: "${result.payee}"`)
    } catch (err) {
      console.error('[OCR] AI fallback failed', err)
      result = {
        payee:       merchantResult.merchant,
        amount:      amountResult.amount,
        occurred_on: dateResult.date || today,
        confidence:  Math.max(merchantResult.confidence, amountResult.confidence) * 0.6,
      }
    }
    ai_ms = Date.now() - t4
  } else {
    result = {
      payee:       merchantResult.merchant,
      amount:      amountResult.amount,
      occurred_on: dateResult.date,
      confidence:  (merchantResult.confidence + amountResult.confidence + (dateResult.confidence || 0.5)) / 3,
    }
  }

  // ⑥ Write cache (confidence >= 0.82 かつ有効なキャッシュシグナルがある場合のみ)
  if (result.confidence >= 0.82 && hasCacheSignal) {
    writeStoreCache(
      fp.storeKey,
      result.payee,
      result.canonicalChain ?? merchantResult.canonicalChain,
      {
        canonicalChain: result.canonicalChain ?? merchantResult.canonicalChain,
        phone:          fp.phone,
        zipcode:        fp.zipcode,
        layoutHash:     fp.layoutHash,
        lastOcrEngine:  needsAI ? 'haiku' : 'heuristic',
      },
      result.confidence,
      householdId,
      supabase,
    ).catch(e => console.warn('[OCR] cache write failed', e))
  }

  const timings: Omit<OcrTimings, 'ocr_ms'> = {
    normalize_ms, merchant_ms, embedding_ms, ai_ms, total_ms: Date.now() - t0,
  }

  logOcrMetrics({ merchantConfidence: merchantResult.confidence, amountConfidence: amountResult.confidence, dateConfidence: dateResult.confidence, cacheHit: false, aiUsed: needsAI, timings: { ocr_ms: 0, ...timings } })

  const { canonicalChain: _cc, ...ocrResult } = result // eslint-disable-line @typescript-eslint/no-unused-vars
  return { ...ocrResult, timings }
}
