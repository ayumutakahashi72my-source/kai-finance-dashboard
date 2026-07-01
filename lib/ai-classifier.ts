import { getEnvKey } from '@/lib/api-keys'
import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ClassificationResponseSchema } from './ai-schemas'
import { embedTextsWithCache } from './embedder'
import { classifyByKeyword } from './keyword-rules'
import { writeClassificationLogs, type ClassificationLogEntry } from './classification-logger'
import { trackCost, type TokenUsageAccum } from './cost-tracker'
import { canonicalizeMerchant } from './merchant-canonical'
import { todayJST } from '@/lib/jst'

const MAX_BATCH = 10
const RAG_EXACT_THRESHOLD = 0.80   // exact キャッシュの直接採用ライン（LLM分類結果を再利用）
const RAG_DIRECT_THRESHOLD = 0.88  // ベクトル検索で直接採用するライン
const RAG_RERANK_THRESHOLD = 0.65  // LLM rerank の候補として使う下限
const RAG_TOPK = 3                 // ベクトル検索の候補数

export const BAD_CATEGORY_NAMES = new Set(['未分類', 'その他', '不明', 'unknown', 'other'])

// ===== 1. Merchant Normalization =====

export function normalizeKeyword(payee: string): string {
  return payee
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    // 法人格の除去
    .replace(/株式会社|有限会社|合同会社|一般社団法人|公益財団法人/g, '')
    .replace(/[(（]株[)）]|㈱|㈲/g, '')
    // 店舗サフィックスの除去（チェーン名を抽出）
    .replace(/[0-9]+号?店$/g, '')
    .replace(/(店|支店|営業所|出張所|センター|ショップ|ストア)$/g, '')
    // 末尾の数字・記号を除去
    .replace(/[-0-9]+$/g, '')
    // 非単語文字を除去
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 64)
}

// ===== Types =====

export interface ClassifyItem {
  index: number
  payee: string
  category_hint: string
}

export interface ClassifyResult {
  categoryIdMap: Map<number, string>
  skipReason?: string
}

interface CategoryMaps {
  nameToId: Map<string, string>
  idToName: Map<string, string>
  parentIdById: Map<string, string | null>
}

// 4. Confidence: 採用経路ごとに一貫したスコアを付与
// exact cache → stored value / vector direct → similarity / rerank → LLM output / full LLM → LLM output

// ===== Category Maps =====

async function fetchCategoryMaps(
  supabase: SupabaseClient,
  householdId: string
): Promise<CategoryMaps> {
  const { data } = await supabase
    .from('categories')
    .select('id, name, parent_id')
    .eq('household_id', householdId)

  const nameToId = new Map<string, string>()
  const idToName = new Map<string, string>()
  const parentIdById = new Map<string, string | null>()
  for (const c of data ?? []) {
    // AI の選択肢から bad names を除外（分類先として選ばせない）
    if (!BAD_CATEGORY_NAMES.has(c.name)) nameToId.set(c.name, c.id)
    idToName.set(c.id, c.name)
    parentIdById.set(c.id, c.parent_id ?? null)
  }
  return { nameToId, idToName, parentIdById }
}

// ===== Correction History =====

async function checkCorrectionsBatch(
  payeeKeys: string[],
  householdId: string,
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  if (!payeeKeys.length) return new Map()
  const { data } = await supabase
    .from('category_corrections')
    .select('payee_key, new_category_id')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeys)
    .order('corrected_at', { ascending: false })

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (!map.has(row.payee_key)) map.set(row.payee_key, row.new_category_id)
  }
  return map
}

export async function logCorrection(
  householdId: string,
  payeeKey: string,
  oldCategoryId: string | null,
  newCategoryId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  await supabase.from('category_corrections').insert({
    household_id: householdId,
    payee_key: payeeKey,
    old_category_id: oldCategoryId,
    new_category_id: newCategoryId,
    corrected_by: userId,
  })
}

// ===== 2. Vector Search Top-K =====

interface VectorCandidate {
  category_id: string
  similarity: number
}

async function vectorSearchTopK(
  items: ClassifyItem[],
  embeddings: number[][],  // 事前計算済み embedding（items と同順）
  householdId: string,
  supabase: SupabaseClient
): Promise<Map<number, VectorCandidate[]>> {
  const result = new Map<number, VectorCandidate[]>()
  if (!embeddings.length) return result

  await Promise.all(
    items.map(async (item, i) => {
      const vec = embeddings[i]
      if (!vec) return

      const { data } = await supabase.rpc('match_category_rag', {
        query_embedding: vec,
        p_household_id: householdId,
        match_threshold: RAG_RERANK_THRESHOLD,
        match_count: RAG_TOPK,
      })

      if (data?.length) {
        result.set(
          item.index,
          data.map((row: { category_id: string; similarity: number }) => ({
            category_id: row.category_id,
            similarity: row.similarity,
          }))
        )
      }
    })
  )

  return result
}

// ===== 3. LLM Rerank (Batch) =====

interface RerankInput {
  index: number
  payee: string
  candidates: Array<{ category_id: string; category_name: string; similarity: number }>
}

async function rerankBatch(
  rerankItems: RerankInput[],
  client: Anthropic,
  accum: TokenUsageAccum
): Promise<Array<{ index: number; category_id: string; confidence: number }>> {
  if (!rerankItems.length) return []

  const sections = rerankItems.map((item, i) => {
    const candidateList = item.candidates
      .map((c, j) => `  ${j + 1}.${c.category_name}(${(c.similarity * 100).toFixed(0)}%)`)
      .join(' ')
    return `取引${i + 1}: 「${item.payee}」\n候補:${candidateList}`
  })

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `以下の各取引について、最も適切なカテゴリを候補から選んでください。

${sections.join('\n\n')}

JSON配列のみ出力（他テキスト不要）:
[{"id": 1, "choice": 1, "confidence": 0.92}, ...]`,
    }],
  })

  accum.inputTokens  += msg.usage.input_tokens
  accum.outputTokens += msg.usage.output_tokens

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ id: number; choice: number; confidence: number }>
    return parsed.flatMap((item) => {
      const rerankItem = rerankItems[item.id - 1]
      if (!rerankItem) return []
      const chosen = rerankItem.candidates[item.choice - 1]
      if (!chosen) return []
      return [{
        index: rerankItem.index,
        category_id: chosen.category_id,
        confidence: Math.min(Math.max(item.confidence, 0), 1),
      }]
    })
  } catch (err) {
    console.warn('[classifier] rerankBatch JSON parse failed:', err instanceof Error ? err.message : err)
    return []
  }
}

// ===== LLM Full Classification =====

async function callHaiku(
  items: ClassifyItem[],
  categoryMap: Map<string, string>,
  client: Anthropic,
  categoryListStr?: string,
  accum?: TokenUsageAccum
): Promise<Array<{ index: number; category_id: string; confidence: number }>> {
  const categoryList = categoryListStr ?? [...categoryMap.keys()].join(', ')
  const inputJson = items.map((it, localIndex) => ({
    index: localIndex,
    payee: it.payee,
    hint: it.category_hint,
  }))

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `以下の取引を日本語カテゴリに分類してください。
利用可能カテゴリ: ${categoryList}

取引リスト（JSON）:
${JSON.stringify(inputJson)}

応答は必ず以下のJSON配列のみ出力してください（他のテキスト不要）。indexは入力と同じ番号を使うこと:
[{"index": 0, "category_name": "食費", "confidence": 0.95}, ...]`,
    }],
  })

  if (accum) {
    accum.inputTokens  += msg.usage.input_tokens
    accum.outputTokens += msg.usage.output_tokens
  }

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  let parsed
  try {
    parsed = ClassificationResponseSchema.safeParse(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.warn('[classifier] callHaiku JSON parse failed:', err instanceof Error ? err.message : err)
    return []
  }
  if (!parsed.success) {
    console.warn('[classifier] callHaiku schema validation failed:', parsed.error.message)
    return []
  }

  return parsed.data.flatMap((item) => {
    const category_id = categoryMap.get(item.category_name)
    if (!category_id) return []
    const originalIndex = items[item.index]?.index
    if (originalIndex === undefined) return []
    return [{ index: originalIndex, category_id, confidence: item.confidence }]
  })
}

// ===== Free-form Classification =====

async function callHaikuFreeForm(
  items: ClassifyItem[],
  client: Anthropic,
  accum: TokenUsageAccum
): Promise<Array<{ index: number; categoryName: string }>> {
  const inputJson = items.map((it, localIndex) => ({
    index: localIndex,
    payee: it.payee,
  }))

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `以下の日本の家計取引を、店舗名・サービス名から具体的な日本語カテゴリに分類してください。

ルール:
- 「その他」は絶対に使わない
- 短く具体的な名前にする（例: 外食、コンビニ、スーパー、交通費、サブスク、医療費、美容院、ジム）
- 同じ種類の店は同じカテゴリにまとめる

取引リスト（JSON）:
${JSON.stringify(inputJson)}

応答は必ず以下のJSON配列のみ出力してください（他のテキスト不要）:
[{"index": 0, "category_name": "外食"}, ...]`,
    }],
  })

  accum.inputTokens  += msg.usage.input_tokens
  accum.outputTokens += msg.usage.output_tokens

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; category_name: string }>
    return parsed.flatMap((item) => {
      const originalIndex = items[item.index]?.index
      if (originalIndex === undefined || !item.category_name) return []
      if (/^(その他|未分類|不明|unknown|other)/i.test(item.category_name.trim())) return []
      return [{ index: originalIndex, categoryName: item.category_name.trim() }]
    })
  } catch (err) {
    console.warn('[classifier] callHaikuFreeForm JSON parse failed:', err instanceof Error ? err.message : err)
    return []
  }
}

// ===== Forced Category Selection =====
// 既存カテゴリリストから必ず1つ選ばせる（最終フォールバック）

async function callHaikuForceSelect(
  items: ClassifyItem[],
  validCategoryNames: string[],
  client: Anthropic,
  accum: TokenUsageAccum
): Promise<Array<{ index: number; categoryName: string }>> {
  if (!items.length || !validCategoryNames.length) return []

  const categoryList = validCategoryNames.join('、')
  const inputJson = items.map((it, localIndex) => ({ index: localIndex, payee: it.payee }))

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0,
    messages: [{
      role: 'user',
      content: `以下の日本の家計取引を、必ず下記カテゴリリストの中から最も近いものを1つ選んでください。
リスト外のカテゴリ名・「その他」・「未分類」は使用禁止です。

カテゴリリスト: ${categoryList}

取引リスト（JSON）:
${JSON.stringify(inputJson)}

応答は必ず以下のJSON配列のみ出力してください（他のテキスト不要）:
[{"index": 0, "category_name": "カテゴリ名"}, ...]`,
    }],
  })

  accum.inputTokens += msg.usage.input_tokens
  accum.outputTokens += msg.usage.output_tokens

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const jsonMatch = raw.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ index: number; category_name: string }>
    const validSet = new Set(validCategoryNames)
    return parsed.flatMap((item) => {
      const originalIndex = items[item.index]?.index
      if (originalIndex === undefined || !item.category_name) return []
      const name = item.category_name.trim()
      if (!validSet.has(name)) return []
      return [{ index: originalIndex, categoryName: name }]
    })
  } catch (err) {
    console.warn('[classifier] callHaikuForceSelect JSON parse failed:', err instanceof Error ? err.message : err)
    return []
  }
}

// ===== Upsert Categories =====

const CATEGORY_PALETTE = [
  '#5eead4', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#fb923c', '#fbbf24', '#4ade80',
  '#fb7185', '#818cf8', '#34d399', '#f59e0b',
  '#e879f9', '#38bdf8', '#a3e635',
]

export function pickCategoryColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = Math.imul(31, h) + name.charCodeAt(i) | 0
  return CATEGORY_PALETTE[Math.abs(h) % CATEGORY_PALETTE.length]
}

import { resolveIconName } from '@/lib/category-icons'
import { LUCIDE_ICON_NAMES_LIST } from '@/components/ui/CategoryIcon'

export async function fetchCategoryIcons(names: string[]): Promise<Map<string, string>> {
  if (!names.length) return new Map()

  const result = new Map<string, string>()
  const unresolved: string[] = []

  for (const name of names) {
    const icon = resolveIconName(name)
    if (icon) {
      result.set(name, icon)
    } else {
      unresolved.push(name)
    }
  }

  if (!unresolved.length) return result

  try {
    const apiKey = getEnvKey('ANTHROPIC_API_KEY')
    const client = new Anthropic({ apiKey })
    const prompt = `以下の日本語支出カテゴリ名に対して、最も適切なLucideアイコン名を1つずつ選んでください。
使用可能なアイコン一覧: ${LUCIDE_ICON_NAMES_LIST.join(', ')}
カテゴリ: ${unresolved.join(', ')}
必ずJSON形式のみで返してください（説明不要）: {"カテゴリ名": "IconName", ...}`
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const json = text.match(/\{[\s\S]*\}/)?.[0]
    if (json) {
      const parsed = JSON.parse(json) as Record<string, string>
      const validSet = new Set(LUCIDE_ICON_NAMES_LIST)
      for (const [k, v] of Object.entries(parsed)) {
        if (validSet.has(v)) result.set(k, v)
      }
    }
  } catch {
    // Haiku失敗時は静的解決分のみ返す
  }

  return result
}

async function upsertCategoriesByName(
  names: string[],
  householdId: string,
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const nameToId = new Map<string, string>()
  if (!names.length) return nameToId

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)
    .in('name', names)

  for (const c of existing ?? []) nameToId.set(c.name, c.id)

  const toCreate = names.filter((n) => !nameToId.has(n))
  if (toCreate.length) {
    // 新規カテゴリに色とアイコンを付与
    const iconMap = await fetchCategoryIcons(toCreate)
    const { data: created } = await supabase
      .from('categories')
      .insert(toCreate.map((name) => ({
        name,
        household_id: householdId,
        color: pickCategoryColor(name),
        icon: iconMap.get(name) ?? null,
      })))
      .select('id, name')
    for (const c of created ?? []) nameToId.set(c.name, c.id)
  }

  return nameToId
}

// ===== RAG Upsert Helper =====

type RagUpsert = {
  household_id: string
  payee_key: string
  category_id: string
  confidence: number
  embedding: number[] | null
  hit_count: number
  last_seen: string
}

type UserKnowledgeUpsert = {
  user_id: string
  payee_key: string
  category_name: string
  confidence: number
  embedding: number[] | null
}

async function syncUserKnowledge(
  ragUpserts: RagUpsert[],
  idToName: Map<string, string>,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const upserts: UserKnowledgeUpsert[] = ragUpserts
    .flatMap((r) => {
      const name = idToName.get(r.category_id)
      if (!name) return []
      return [{ user_id: userId, payee_key: r.payee_key, category_name: name, confidence: r.confidence, embedding: r.embedding }]
    })
  if (!upserts.length) return
  const { error } = await supabase
    .from('user_category_knowledge')
    .upsert(upserts, { onConflict: 'user_id,payee_key' })
  if (error) console.error('[classifier] user_category_knowledge upsert failed:', error.message)
}

/**
 * category_rag への書き込みを一本化するヘルパー（R-3/R-7）。
 *
 * category_rag_upsert_batch RPC は以下を保証する:
 *   - 同一カテゴリでの再分類: confidence は GREATEST（低い再分類結果で退行させない）
 *   - カテゴリが変わった場合: 新しい値でそのまま置き換え（古いカテゴリの高confidenceを
 *     引き継がない）＋ hit_count を 1 にリセット（別カテゴリとしての学習をやり直す）
 *   - hit_count はDB側でアトミックに +1（JS側での読み取り→計算のレースを避ける）
 *
 * ENABLE_RAG_GREATEST_UPSERT=false で旧実装（無条件上書き）にフォールバック可能。
 */
export async function upsertCategoryRag(
  supabase: SupabaseClient,
  householdId: string,
  rows: RagUpsert[],
): Promise<void> {
  if (!rows.length) return

  if (process.env.ENABLE_RAG_GREATEST_UPSERT === 'false') {
    const { error } = await supabase.from('category_rag').upsert(rows, { onConflict: 'household_id,payee_key' })
    if (error) console.error('[classifier] category_rag upsert (legacy) failed:', error.message)
    return
  }

  const { error } = await supabase.rpc('category_rag_upsert_batch', {
    p_household_id: householdId,
    p_rows: rows,
  })
  if (error) console.error('[classifier] category_rag_upsert_batch failed:', error.message)
}

// ===== classifyTransactions =====
// Pipeline: corrections → exact cache → vector top-k → LLM rerank (ambiguous) → full LLM (no candidates)

export async function classifyTransactions(
  items: ClassifyItem[],
  householdId: string,
  supabase: SupabaseClient,
  userId?: string
): Promise<ClassifyResult> {
  const categoryIdMap = new Map<number, string>()
  if (!items.length) return { categoryIdMap }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { categoryIdMap, skipReason: 'ANTHROPIC_API_KEY が設定されていません' }
  }

  const { nameToId: categoryMap, idToName, parentIdById } = await fetchCategoryMaps(supabase, householdId)
  if (!categoryMap.size) {
    return { categoryIdMap, skipReason: 'カテゴリが1件も登録されていません' }
  }

  const startTime = Date.now()
  const logs: ClassificationLogEntry[] = []
  const tokenAccum: TokenUsageAccum = { inputTokens: 0, outputTokens: 0 }

  // ⓪ 修正履歴（最優先：ユーザーが手動修正した payee は即時確定）
  const allPayeeKeys = items.map((it) => normalizeKeyword(it.payee))
  const correctionMap = await checkCorrectionsBatch(allPayeeKeys, householdId, supabase)
  const itemsAfterCorrections: ClassifyItem[] = []
  for (const item of items) {
    const correctedId = correctionMap.get(normalizeKeyword(item.payee))
    if (correctedId) {
      categoryIdMap.set(item.index, correctedId)
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: normalizeKeyword(item.payee),
        category_hint: item.category_hint,
        category_id: correctedId,
        category_name: idToName.get(correctedId),
        method: 'correction',
        confidence: 1.0,
        is_cache_hit: true,
        latency_ms: Date.now() - startTime,
      })
    } else {
      itemsAfterCorrections.push(item)
    }
  }
  if (!itemsAfterCorrections.length) {
    void writeClassificationLogs(logs, supabase)
    return { categoryIdMap }
  }

  // ① Exact cache（LLM が学習した結果 — regex より優先して上書きできる learned override layer）
  // hit_count >= 3 の場合は他の月でも繰り返し見られた実績があるため閾値を 0.75 に緩和
  const RAG_REPEAT_THRESHOLD = 0.75
  const RAG_REPEAT_MIN_HITS = 3
  const payeeKeysForCache = itemsAfterCorrections.map((it) => normalizeKeyword(it.payee))
  const { data: ragRows } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence, hit_count')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeysForCache)

  // 既存 hit_count マップ（全件 — 閾値未満も含む）
  const ragHitCountMap = new Map<string, number>()
  for (const row of ragRows ?? []) ragHitCountMap.set(row.payee_key, row.hit_count ?? 1)

  const exactCacheMap = new Map<string, { category_id: string; confidence: number }>()
  for (const row of ragRows ?? []) {
    const conf = row.confidence ?? 0
    const hits = row.hit_count ?? 0
    const threshold = hits >= RAG_REPEAT_MIN_HITS ? RAG_REPEAT_THRESHOLD : RAG_EXACT_THRESHOLD
    if (conf >= threshold) {
      exactCacheMap.set(row.payee_key, { category_id: row.category_id, confidence: conf })
    }
  }

  // ragUpserts はここから全ステージで使う（exact_cache / regex / vector / LLM 全て書き込む）
  const ragUpserts: RagUpsert[] = []
  const today = todayJST()

  const itemsAfterExactCache: ClassifyItem[] = []
  for (const item of itemsAfterCorrections) {
    const payeeKey = normalizeKeyword(item.payee)
    const cached = exactCacheMap.get(payeeKey)
    if (cached) {
      categoryIdMap.set(item.index, cached.category_id)
      // R-7: exact_cacheヒットでもhit_countを+1する（従来は増分されず repeat 閾値判定が不正確だった）
      ragUpserts.push({
        household_id: householdId,
        payee_key: payeeKey,
        category_id: cached.category_id,
        confidence: cached.confidence,
        embedding: null,
        hit_count: (ragHitCountMap.get(payeeKey) ?? 0) + 1,
        last_seen: today,
      })
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: payeeKey,
        category_hint: item.category_hint,
        category_id: cached.category_id,
        category_name: idToName.get(cached.category_id),
        method: 'exact_cache',
        confidence: cached.confidence,
        is_cache_hit: true,
        latency_ms: Date.now() - startTime,
      })
    } else {
      itemsAfterExactCache.push(item)
    }
  }
  if (!itemsAfterExactCache.length) {
    if (ragUpserts.length) await upsertCategoryRag(supabase, householdId, ragUpserts)
    void writeClassificationLogs(logs, supabase)
    return { categoryIdMap }
  }

  // ② Regex rule（DB 不要 — in-memory キーワードマッチ、純粋な perf optimization）
  const remaining: ClassifyItem[] = []
  for (const item of itemsAfterExactCache) {
    const payeeKey = normalizeKeyword(item.payee)
    const categoryName = classifyByKeyword(payeeKey)
    const categoryId = categoryName ? categoryMap.get(categoryName) : undefined
    if (categoryId) {
      categoryIdMap.set(item.index, categoryId)
      // exact_cache にない場合は RAG に書き込んでおく（次回から exact_cache でヒット）
      if (!exactCacheMap.has(payeeKey)) {
        ragUpserts.push({
          household_id: householdId,
          payee_key: payeeKey,
          category_id: categoryId,
          confidence: 1.0,
          embedding: null,
          hit_count: (ragHitCountMap.get(payeeKey) ?? 0) + 1,
          last_seen: today,
        })
      }
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: payeeKey,
        category_hint: item.category_hint,
        category_id: categoryId,
        category_name: categoryName ?? undefined,
        method: 'regex_rule',
        confidence: 1.0,
        is_cache_hit: true,
        latency_ms: Date.now() - startTime,
      })
    } else {
      // R-6: キーワードルールは一致したがカテゴリ未登録（世帯側でリネーム/削除済み等）。
      // 自動作成はせず（重複再発防止）、可視化のためログのみ残してLLM経路にフォールバックする。
      if (categoryName) {
        logs.push({
          household_id: householdId,
          payee: item.payee,
          payee_key: payeeKey,
          category_hint: item.category_hint,
          category_name: categoryName,
          method: 'regex_miss',
          is_cache_hit: false,
          latency_ms: Date.now() - startTime,
        })
      }
      remaining.push(item)
    }
  }

  if (!remaining.length) {
    void writeClassificationLogs(logs, supabase)
    return { categoryIdMap }
  }

  // index → remaining配列内位置のマップ（O(1)逆引き）
  const remainingIdxMap = new Map<number, number>()
  for (let i = 0; i < remaining.length; i++) remainingIdxMap.set(remaining[i].index, i)
  const remainingItemMap = new Map<number, ClassifyItem>()
  for (const item of remaining) remainingItemMap.set(item.index, item)

  // ③ Embeddings（vector search と cache 保存で共用）
  let remainingEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      remainingEmbeddings = await embedTextsWithCache(remaining.map((it) => normalizeKeyword(it.payee)), supabase)
    } catch { /* embedding 失敗は無視 */ }
  }

  const vecCandidates = await vectorSearchTopK(remaining, remainingEmbeddings, householdId, supabase)

  const needsRerank: RerankInput[] = []
  const needsLLM: ClassifyItem[] = []

  for (const item of remaining) {
    const candidates = vecCandidates.get(item.index)

    if (!candidates?.length) {
      needsLLM.push(item)
      continue
    }

    // bad category はベクトル候補から除外
    const filteredCandidates = candidates.filter(
      (c) => !BAD_CATEGORY_NAMES.has(idToName.get(c.category_id) ?? '')
    )
    if (!filteredCandidates.length) {
      needsLLM.push(item)
      continue
    }
    const best = filteredCandidates[0]
    if (best.similarity >= RAG_DIRECT_THRESHOLD) {
      // 高信頼度: 直接採用（confidence = similarity）
      categoryIdMap.set(item.index, best.category_id)
      const idx = remainingIdxMap.get(item.index) ?? -1
      const vdKey = normalizeKeyword(item.payee)
      ragUpserts.push({
        household_id: householdId,
        payee_key: vdKey,
        category_id: best.category_id,
        confidence: best.similarity,
        embedding: remainingEmbeddings[idx] ?? null,
        hit_count: (ragHitCountMap.get(vdKey) ?? 0) + 1,
        last_seen: today,
      })
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: normalizeKeyword(item.payee),
        category_hint: item.category_hint,
        category_id: best.category_id,
        category_name: idToName.get(best.category_id),
        method: 'vector_direct',
        confidence: best.similarity,
        similarity: best.similarity,
        is_cache_hit: false,
        latency_ms: Date.now() - startTime,
      })
    } else {
      // 曖昧: LLM rerank へ
      const namedCandidates = filteredCandidates
        .map((c) => ({ ...c, category_name: idToName.get(c.category_id) ?? '' }))
        .filter((c) => c.category_name && !BAD_CATEGORY_NAMES.has(c.category_name))

      if (!namedCandidates.length) {
        needsLLM.push(item)
      } else {
        needsRerank.push({ index: item.index, payee: item.payee, candidates: namedCandidates })
      }
    }
  }

  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })

  // 階層カテゴリ表示リスト（"親 > 子" 形式）を事前構築
  const hierarchyCategoryList = [...categoryMap.entries()].map(([name, id]) => {
    const parentId = parentIdById.get(id)
    if (parentId) {
      const parentName = idToName.get(parentId)
      if (parentName) return `${parentName} > ${name}`
    }
    return name
  }).join(', ')

  // ③ LLM Rerank（バッチ）
  if (needsRerank.length) {
    try {
      const results = await rerankBatch(needsRerank, client, tokenAccum)
      for (const r of results) {
        categoryIdMap.set(r.index, r.category_id)
        const item = remainingItemMap.get(r.index)
        if (item) {
          const idx = remainingIdxMap.get(item.index) ?? -1
          const bestSim = vecCandidates.get(item.index)?.[0]?.similarity
          const rrKey = normalizeKeyword(item.payee)
          ragUpserts.push({
            household_id: householdId,
            payee_key: rrKey,
            category_id: r.category_id,
            confidence: r.confidence,
            embedding: remainingEmbeddings[idx] ?? null,
            hit_count: (ragHitCountMap.get(rrKey) ?? 0) + 1,
            last_seen: today,
          })
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: normalizeKeyword(item.payee),
            category_hint: item.category_hint,
            category_id: r.category_id,
            category_name: idToName.get(r.category_id),
            method: 'vector_rerank',
            confidence: r.confidence,
            similarity: bestSim,
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
          })
        }
      }
      // rerank 失敗分は full LLM へ
      const resolvedByRerank = new Set(results.map((r) => r.index))
      for (const ri of needsRerank) {
        if (!resolvedByRerank.has(ri.index)) {
          const item = remainingItemMap.get(ri.index)
          if (item) needsLLM.push(item)
        }
      }
    } catch {
      // rerank 全体失敗 → full LLM にフォールバック
      for (const ri of needsRerank) {
        const item = remainingItemMap.get(ri.index)
        if (item) needsLLM.push(item)
      }
    }
  }

  // ④ Full LLM Classification（同一チェーン店は代表1件だけ LLM に投げて全件に展開）
  // canonicalizeMerchant で地名バリエーションも同一キーにまとめる
  const llmKeyToItems = new Map<string, ClassifyItem[]>()
  for (const item of needsLLM) {
    const k = canonicalizeMerchant(normalizeKeyword(item.payee))
    if (!llmKeyToItems.has(k)) llmKeyToItems.set(k, [])
    llmKeyToItems.get(k)!.push(item)
  }
  // 各グループの先頭のみ分類対象にする（重複排除）
  const dedupedNeedsLLM = [...llmKeyToItems.values()].map((g) => g[0]!)

  for (let i = 0; i < dedupedNeedsLLM.length; i += MAX_BATCH) {
    const batch = dedupedNeedsLLM.slice(i, i + MAX_BATCH)
    try {
      const classified = await callHaiku(batch, categoryMap, client, hierarchyCategoryList, tokenAccum)
      const resolvedByLLM = new Set(classified.map((c) => c.index))
      for (const c of classified) {
        categoryIdMap.set(c.index, c.category_id)
        const item = remainingItemMap.get(c.index)
        if (item) {
          const idx = remainingIdxMap.get(item.index) ?? -1
          const llmKey = normalizeKeyword(item.payee)
          ragUpserts.push({
            household_id: householdId,
            payee_key: llmKey,
            category_id: c.category_id,
            confidence: c.confidence,
            embedding: remainingEmbeddings[idx] ?? null,
            hit_count: (ragHitCountMap.get(llmKey) ?? 0) + 1,
            last_seen: today,
          })
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: normalizeKeyword(item.payee),
            category_hint: item.category_hint,
            category_id: c.category_id,
            category_name: idToName.get(c.category_id),
            method: 'llm_full',
            confidence: c.confidence,
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
          })
        }
      }
      // LLM でも解決できなかった分
      for (const batchItem of batch) {
        if (!resolvedByLLM.has(batchItem.index)) {
          logs.push({
            household_id: householdId,
            payee: batchItem.payee,
            payee_key: normalizeKeyword(batchItem.payee),
            category_hint: batchItem.category_hint,
            method: 'failed',
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
            error_message: 'LLM response did not include this item',
          })
        }
      }
    } catch (err) {
      for (const batchItem of batch) {
        logs.push({
          household_id: householdId,
          payee: batchItem.payee,
          payee_key: normalizeKeyword(batchItem.payee),
          category_hint: batchItem.category_hint,
          method: 'failed',
          is_cache_hit: false,
          api_calls: 1,
          latency_ms: Date.now() - startTime,
          error_message: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  // 重複排除で省略したアイテムに代表の分類結果を展開
  for (const [key, groupItems] of llmKeyToItems) {
    if (groupItems.length <= 1) continue
    const rep = groupItems[0]!
    const repCategoryId = categoryIdMap.get(rep.index)
    if (repCategoryId === undefined) continue
    for (const dup of groupItems.slice(1)) {
      categoryIdMap.set(dup.index, repCategoryId)
      logs.push({
        household_id: householdId,
        payee: dup.payee,
        payee_key: key,
        category_hint: dup.category_hint,
        category_id: repCategoryId,
        category_name: idToName.get(repCategoryId),
        method: 'exact_cache',   // 同バッチ内重複 = キャッシュ扱い
        confidence: 1.0,
        is_cache_hit: true,
        latency_ms: 0,
      })
    }
  }

  // ⑤ Forced selection — still-unresolved items get forced into an existing category
  const unresolvedInClassify = remaining.filter((it) => !categoryIdMap.has(it.index))
  if (unresolvedInClassify.length) {
    try {
      const validNames = [...categoryMap.keys()]
      const forceResults = await callHaikuForceSelect(unresolvedInClassify, validNames, client, tokenAccum)
      for (const { index, categoryName } of forceResults) {
        const catId = categoryMap.get(categoryName)
        if (!catId) continue
        categoryIdMap.set(index, catId)
        const item = remainingItemMap.get(index)
        if (item) {
          const idx = remainingIdxMap.get(item.index) ?? -1
          const fKey = normalizeKeyword(item.payee)
          ragUpserts.push({
            household_id: householdId,
            payee_key: fKey,
            category_id: catId,
            confidence: 0.7,
            embedding: remainingEmbeddings[idx] ?? null,
            hit_count: (ragHitCountMap.get(fKey) ?? 0) + 1,
            last_seen: today,
          })
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: normalizeKeyword(item.payee),
            category_hint: item.category_hint,
            category_id: catId,
            category_name: categoryName,
            method: 'llm_force',
            confidence: 0.7,
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
          })
        }
      }
    } catch { /* force select 失敗はスキップ */ }
  }

  if (ragUpserts.length) {
    await upsertCategoryRag(supabase, householdId, ragUpserts)
    if (userId) void syncUserKnowledge(ragUpserts, idToName, userId, supabase)
  }

  void writeClassificationLogs(logs, supabase)

  if (tokenAccum.inputTokens > 0 || tokenAccum.outputTokens > 0) {
    void trackCost({
      household_id: householdId,
      model: 'claude-haiku-4-5-20251001',
      feature: 'classification',
      input_tokens: tokenAccum.inputTokens,
      output_tokens: tokenAccum.outputTokens,
    }, supabase)
  }

  return { categoryIdMap }
}

// ===== classifyFreeForm =====
// Pipeline: corrections → exact cache → regex rule → vector top-k（直接採用のみ） → AI freeform

export async function classifyFreeForm(
  items: ClassifyItem[],
  householdId: string,
  supabase: SupabaseClient,
  userId?: string
): Promise<Map<number, string>> {
  const categoryIdMap = new Map<number, string>()
  if (!items.length) return categoryIdMap

  const startTime = Date.now()
  const logs: ClassificationLogEntry[] = []
  const tokenAccum: TokenUsageAccum = { inputTokens: 0, outputTokens: 0 }

  // ⓪ 修正履歴
  const allKeys = items.map((it) => normalizeKeyword(it.payee))
  const correctionMap = await checkCorrectionsBatch(allKeys, householdId, supabase)
  const itemsAfterCorrections: ClassifyItem[] = []
  for (const item of items) {
    const correctedId = correctionMap.get(normalizeKeyword(item.payee))
    if (correctedId) {
      categoryIdMap.set(item.index, correctedId)
    } else {
      itemsAfterCorrections.push(item)
    }
  }
  if (!itemsAfterCorrections.length) {
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // 既存カテゴリ名 → ID のマップを取得
  const { nameToId: existingNameToId, idToName: existingIdToName } = await fetchCategoryMaps(supabase, householdId)

  // ① Exact cache（LLM が学習した結果 — learned override layer）
  const RAG_REPEAT_THRESHOLD_FREE = 0.75
  const RAG_REPEAT_MIN_HITS_FREE = 3
  const payeeKeysForCache = itemsAfterCorrections.map((it) => normalizeKeyword(it.payee))
  const { data: ragRowsFree } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence, hit_count')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeysForCache)

  const ragHitCountMapFree = new Map<string, number>()
  for (const row of ragRowsFree ?? []) ragHitCountMapFree.set(row.payee_key, row.hit_count ?? 1)

  const exactCacheMapFree = new Map<string, { category_id: string; confidence: number }>()
  for (const row of ragRowsFree ?? []) {
    const conf = row.confidence ?? 0
    const hits = row.hit_count ?? 0
    const threshold = hits >= RAG_REPEAT_MIN_HITS_FREE ? RAG_REPEAT_THRESHOLD_FREE : RAG_EXACT_THRESHOLD
    if (conf >= threshold) {
      exactCacheMapFree.set(row.payee_key, { category_id: row.category_id, confidence: conf })
    }
  }

  const ragUpsertsF: RagUpsert[] = []
  const todayF = todayJST()

  const itemsAfterExactCache: ClassifyItem[] = []
  for (const item of itemsAfterCorrections) {
    const payeeKey = normalizeKeyword(item.payee)
    const cached = exactCacheMapFree.get(payeeKey)
    if (cached) {
      categoryIdMap.set(item.index, cached.category_id)
      // R-7: exact_cacheヒットでもhit_countを+1する
      ragUpsertsF.push({
        household_id: householdId,
        payee_key: payeeKey,
        category_id: cached.category_id,
        confidence: cached.confidence,
        embedding: null,
        hit_count: (ragHitCountMapFree.get(payeeKey) ?? 0) + 1,
        last_seen: todayF,
      })
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: payeeKey,
        category_hint: item.category_hint,
        category_id: cached.category_id,
        category_name: existingIdToName.get(cached.category_id),
        method: 'exact_cache',
        confidence: cached.confidence,
        is_cache_hit: true,
        latency_ms: Date.now() - startTime,
      })
    } else {
      itemsAfterExactCache.push(item)
    }
  }
  if (!itemsAfterExactCache.length) {
    if (ragUpsertsF.length) await upsertCategoryRag(supabase, householdId, ragUpsertsF)
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // ② Regex rule（DB 不要 — in-memory キーワードマッチ、純粋な perf optimization）
  const remaining: ClassifyItem[] = []
  for (const item of itemsAfterExactCache) {
    const payeeKey = normalizeKeyword(item.payee)
    const categoryName = classifyByKeyword(payeeKey)
    const categoryId = categoryName ? existingNameToId.get(categoryName) : undefined
    if (categoryId) {
      categoryIdMap.set(item.index, categoryId)
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: payeeKey,
        category_hint: item.category_hint,
        category_id: categoryId,
        category_name: categoryName ?? undefined,
        method: 'regex_rule',
        confidence: 1.0,
        is_cache_hit: true,
        latency_ms: Date.now() - startTime,
      })
    } else {
      // R-6: キーワードルールは一致したがカテゴリ未登録。自動作成はせず可視化のみ行う。
      if (categoryName) {
        logs.push({
          household_id: householdId,
          payee: item.payee,
          payee_key: payeeKey,
          category_hint: item.category_hint,
          category_name: categoryName,
          method: 'regex_miss',
          is_cache_hit: false,
          latency_ms: Date.now() - startTime,
        })
      }
      remaining.push(item)
    }
  }

  if (!remaining.length) {
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // index → remaining配列内位置のマップ（O(1)逆引き）
  const remainingIdxMapF = new Map<number, number>()
  for (let i = 0; i < remaining.length; i++) remainingIdxMapF.set(remaining[i].index, i)

  // ③ Embeddings（共用）
  let remainingEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      remainingEmbeddings = await embedTextsWithCache(remaining.map((it) => normalizeKeyword(it.payee)), supabase)
    } catch { /* 無視 */ }
  }

  const vecCandidates = await vectorSearchTopK(remaining, remainingEmbeddings, householdId, supabase)
  const needsLLM: ClassifyItem[] = []

  for (const item of remaining) {
    const rawCandidates = vecCandidates.get(item.index)
    const candidates = rawCandidates?.filter(
      (c) => !BAD_CATEGORY_NAMES.has(existingIdToName.get(c.category_id) ?? '')
    )
    const best = candidates?.[0]
    if (best && best.similarity >= RAG_DIRECT_THRESHOLD) {
      categoryIdMap.set(item.index, best.category_id)
      const idx = remainingIdxMapF.get(item.index) ?? -1
      const fvdKey = normalizeKeyword(item.payee)
      ragUpsertsF.push({
        household_id: householdId,
        payee_key: fvdKey,
        category_id: best.category_id,
        confidence: best.similarity,
        embedding: remainingEmbeddings[idx] ?? null,
        hit_count: (ragHitCountMapFree.get(fvdKey) ?? 0) + 1,
        last_seen: todayF,
      })
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: fvdKey,
        category_hint: item.category_hint,
        category_id: best.category_id,
        category_name: existingIdToName.get(best.category_id),
        method: 'vector_direct',
        confidence: best.similarity,
        similarity: best.similarity,
        is_cache_hit: false,
        latency_ms: Date.now() - startTime,
      })
    } else {
      needsLLM.push(item)
    }
  }

  if (!needsLLM.length || !process.env.ANTHROPIC_API_KEY) {
    if (ragUpsertsF.length) {
      await upsertCategoryRag(supabase, householdId, ragUpsertsF)
      if (userId) void syncUserKnowledge(ragUpsertsF, existingIdToName, userId, supabase)
    }
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // needsLLM の逆引きMap
  const needsLLMMap = new Map<number, ClassifyItem>()
  for (const item of needsLLM) needsLLMMap.set(item.index, item)

  // ④ AI freeform
  const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })
  const allNamed: Array<{ index: number; categoryName: string }> = []

  for (let i = 0; i < needsLLM.length; i += MAX_BATCH) {
    const batch = needsLLM.slice(i, i + MAX_BATCH)
    try {
      allNamed.push(...await callHaikuFreeForm(batch, client, tokenAccum))
    } catch { /* バッチ失敗はスキップ */ }
  }

  if (!allNamed.length) {
    // freeform が全滅した場合も force select を試みる
    try {
      const validNames = [...existingNameToId.keys()]
      const forceResults = await callHaikuForceSelect(needsLLM, validNames, client, tokenAccum)
      for (const { index, categoryName } of forceResults) {
        const catId = existingNameToId.get(categoryName)
        if (!catId) continue
        categoryIdMap.set(index, catId)
        const item = needsLLMMap.get(index)
        if (item) {
          const idx = remainingIdxMapF.get(item.index) ?? -1
          const ffKey = normalizeKeyword(item.payee)
          ragUpsertsF.push({
            household_id: householdId,
            payee_key: ffKey,
            category_id: catId,
            confidence: 0.7,
            embedding: remainingEmbeddings[idx] ?? null,
            hit_count: (ragHitCountMapFree.get(ffKey) ?? 0) + 1,
            last_seen: todayF,
          })
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: ffKey,
            category_hint: item.category_hint,
            category_id: catId,
            category_name: categoryName,
            method: 'llm_force',
            confidence: 0.7,
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
          })
        }
      }
    } catch { /* force select 失敗はスキップ */ }
    if (ragUpsertsF.length) {
      await upsertCategoryRag(supabase, householdId, ragUpsertsF)
      if (userId) void syncUserKnowledge(ragUpsertsF, existingIdToName, userId, supabase)
    }
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  const uniqueNames = [...new Set(allNamed.map((n) => n.categoryName))]
  const nameToId = await upsertCategoriesByName(uniqueNames, householdId, supabase)

  const resolvedLLM = new Set<number>()
  for (const { index, categoryName } of allNamed) {
    const catId = nameToId.get(categoryName)
    if (!catId) continue
    categoryIdMap.set(index, catId)
    resolvedLLM.add(index)
    const item = needsLLMMap.get(index)
    if (item) {
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: normalizeKeyword(item.payee),
        category_hint: item.category_hint,
        category_id: catId,
        category_name: categoryName,
        method: 'llm_freeform',
        confidence: 0.9,
        is_cache_hit: false,
        api_calls: 1,
        latency_ms: Date.now() - startTime,
      })
      const idx = remainingIdxMapF.get(item.index) ?? -1
      const ffKey2 = normalizeKeyword(item.payee)
      ragUpsertsF.push({
        household_id: householdId,
        payee_key: ffKey2,
        category_id: catId,
        confidence: 0.9,
        embedding: remainingEmbeddings[idx] ?? null,
        hit_count: (ragHitCountMapFree.get(ffKey2) ?? 0) + 1,
        last_seen: todayF,
      })
    }
  }

  // ⑤ Forced selection — LLM が解決できなかった分を既存カテゴリから強制選択
  const unresolvedFreeForm = needsLLM.filter((it) => !resolvedLLM.has(it.index))
  if (unresolvedFreeForm.length) {
    try {
      const validNames = [...existingNameToId.keys()]
      const forceResults = await callHaikuForceSelect(unresolvedFreeForm, validNames, client, tokenAccum)
      const resolvedByForce = new Set<number>()
      for (const { index, categoryName } of forceResults) {
        const catId = existingNameToId.get(categoryName)
        if (!catId) continue
        categoryIdMap.set(index, catId)
        resolvedByForce.add(index)
        const item = needsLLMMap.get(index)
        if (item) {
          const idx = remainingIdxMapF.get(item.index) ?? -1
          const ffKey3 = normalizeKeyword(item.payee)
          ragUpsertsF.push({
            household_id: householdId,
            payee_key: ffKey3,
            category_id: catId,
            confidence: 0.7,
            embedding: remainingEmbeddings[idx] ?? null,
            hit_count: (ragHitCountMapFree.get(ffKey3) ?? 0) + 1,
            last_seen: todayF,
          })
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: ffKey3,
            category_hint: item.category_hint,
            category_id: catId,
            category_name: categoryName,
            method: 'llm_force',
            confidence: 0.7,
            is_cache_hit: false,
            api_calls: 1,
            latency_ms: Date.now() - startTime,
          })
        }
      }
      // それでも解決できなかった分のみ failed ログ
      for (const item of unresolvedFreeForm) {
        if (!resolvedByForce.has(item.index)) {
          logs.push({
            household_id: householdId,
            payee: item.payee,
            payee_key: normalizeKeyword(item.payee),
            category_hint: item.category_hint,
            method: 'failed',
            is_cache_hit: false,
            api_calls: 2,
            latency_ms: Date.now() - startTime,
          })
        }
      }
    } catch {
      for (const item of unresolvedFreeForm) {
        logs.push({
          household_id: householdId,
          payee: item.payee,
          payee_key: normalizeKeyword(item.payee),
          category_hint: item.category_hint,
          method: 'failed',
          is_cache_hit: false,
          api_calls: 1,
          latency_ms: Date.now() - startTime,
        })
      }
    }
  }

  if (ragUpsertsF.length) {
    await upsertCategoryRag(supabase, householdId, ragUpsertsF)
    if (userId) void syncUserKnowledge(ragUpsertsF, existingIdToName, userId, supabase)
  }

  if (tokenAccum.inputTokens > 0 || tokenAccum.outputTokens > 0) {
    void trackCost({
      household_id: householdId,
      model: 'claude-haiku-4-5-20251001',
      feature: 'classification',
      input_tokens: tokenAccum.inputTokens,
      output_tokens: tokenAccum.outputTokens,
    }, supabase)
  }

  void writeClassificationLogs(logs, supabase)
  return categoryIdMap
}
