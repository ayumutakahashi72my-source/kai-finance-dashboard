import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalizeMerchant } from './merchant-canonical'
import { retryWithBackoff, isRetryableHttpError } from './retry'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const EMBED_MODEL = 'voyage-3-lite' // 512次元、日本語対応、最安値

interface VoyageResponse {
  data: Array<{ embedding: number[] }>
}

/**
 * 複数テキストを一括でベクトル化して返す。
 * Voyage AI voyage-3-lite: 512次元、$0.02/1M tokens。
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return []

  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error('VOYAGE_API_KEY が設定されていません')

  // R-5: 429/5xx/ネットワークエラーはbackoff付きでリトライ
  return retryWithBackoff(async () => {
    const res = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: texts, model: EMBED_MODEL }),
    })

    if (!res.ok) {
      const body = await res.text()
      const err = new Error(`Voyage API error ${res.status}: ${body}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }

    const json = (await res.json()) as VoyageResponse
    return json.data.map((d) => d.embedding)
  }, { maxRetries: 2, shouldRetry: isRetryableHttpError })
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  return vec
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

/**
 * embedTexts のキャッシュ付き版。
 *
 * パイプライン:
 *   normalizedKeys (normalizeKeyword 済み)
 *     → canonicalizeMerchant()   ← semantic canonicalization
 *     → sha256Hex()              ← cache key
 *     → merchant_embedding_cache lookup
 *     → (miss のみ) Voyage AI 呼び出し → INSERT
 *
 * category_rag.payee_key は normalizeKeyword 出力のまま（変更禁止）。
 * canonicalize はこの関数の内部にのみ閉じ込める。
 */
export async function embedTextsWithCache(
  normalizedKeys: string[],
  supabase: SupabaseClient,
): Promise<number[][]> {
  if (!normalizedKeys.length) return []

  // ① canonical form に変換してからハッシュ計算
  const canonicalKeys = normalizedKeys.map(canonicalizeMerchant)
  const hashes = canonicalKeys.map(sha256Hex)

  // ② キャッシュ一括 SELECT
  const { data: cached } = await supabase
    .from('merchant_embedding_cache')
    .select('normalized_hash, embedding')
    .in('normalized_hash', hashes)

  const hitMap = new Map<string, number[]>()
  if (cached) {
    for (const row of cached) {
      hitMap.set(row.normalized_hash as string, row.embedding as number[])
    }
  }

  // ③ ミスした一意ハッシュだけを収集（同一バッチ内の重複店舗名を1回に集約。
  //    重複排除しないと同一hashへの多重INSERTでunique制約違反が起き得るため）
  const missHashToKey = new Map<string, string>()
  for (let i = 0; i < canonicalKeys.length; i++) {
    if (!hitMap.has(hashes[i]) && !missHashToKey.has(hashes[i])) {
      missHashToKey.set(hashes[i], canonicalKeys[i])
    }
  }
  const missHashes = [...missHashToKey.keys()]
  const missKeys = missHashes.map((h) => missHashToKey.get(h)!)

  // ④ ミス分を Voyage AI で取得（canonical form をそのまま送る）
  if (missKeys.length) {
    const freshVectors = await embedTexts(missKeys)
    for (let j = 0; j < missHashes.length; j++) {
      hitMap.set(missHashes[j], freshVectors[j])
    }

    // ⑤ キャッシュに保存。同時実行時の重複INSERTにも耐えるよう upsert + ignoreDuplicates。
    const inserts = missHashes.map((hash, j) => ({
      normalized_hash: hash,
      normalized_key:  missKeys[j],             // canonical form を格納
      embedding: freshVectors[j],
    }))
    const { error: cacheErr } = await supabase
      .from('merchant_embedding_cache')
      .upsert(inserts, { onConflict: 'normalized_hash', ignoreDuplicates: true })
    if (cacheErr) console.error('[embedder] cache upsert failed:', cacheErr.message)
  }

  // ⑥ 元の順序で結果を組み立てて返す（hitMapに全hashの埋め込みが揃っている）
  return hashes.map((h) => hitMap.get(h) ?? [])
}
