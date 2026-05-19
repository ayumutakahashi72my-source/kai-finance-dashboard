import { createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalizeMerchant } from './merchant-canonical'

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
    throw new Error(`Voyage API error ${res.status}: ${body}`)
  }

  const json = (await res.json()) as VoyageResponse
  return json.data.map((d) => d.embedding)
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

  // ③ ミスしたインデックスと canonical key を収集
  const missIndexes: number[] = []
  const missKeys: string[] = []
  for (let i = 0; i < canonicalKeys.length; i++) {
    if (!hitMap.has(hashes[i])) {
      missIndexes.push(i)
      missKeys.push(canonicalKeys[i])
    }
  }

  // ④ ミス分を Voyage AI で取得（canonical form をそのまま送る）
  let freshVectors: number[][] = []
  if (missKeys.length) {
    freshVectors = await embedTexts(missKeys)

    // ⑤ キャッシュに保存（競合は無視）
    const inserts = missKeys.map((key, j) => ({
      normalized_hash: hashes[missIndexes[j]],
      normalized_key:  key,                    // canonical form を格納
      embedding: freshVectors[j],
    }))
    const { error: cacheErr } = await supabase.from('merchant_embedding_cache').insert(inserts, { count: 'none' })
    if (cacheErr) console.error('[embedder] cache insert failed:', cacheErr.message)
  }

  // ⑥ 元の順序で結果を組み立てて返す（missIndexes.indexOf はO(n²)になるためMapに変換）
  const missIndexMap = new Map<number, number>()
  for (let j = 0; j < missIndexes.length; j++) {
    missIndexMap.set(missIndexes[j], j)
  }
  const result: number[][] = new Array(normalizedKeys.length)
  for (let i = 0; i < normalizedKeys.length; i++) {
    const fromCache = hitMap.get(hashes[i])
    if (fromCache) {
      result[i] = fromCache
    } else {
      const missPos = missIndexMap.get(i) ?? -1
      result[i] = missPos >= 0 ? freshVectors[missPos] : []
    }
  }
  return result
}
