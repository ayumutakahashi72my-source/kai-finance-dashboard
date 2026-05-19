import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ClassificationResponseSchema } from './ai-schemas'
import { embedTextsWithCache } from './embedder'
import { classifyByKeyword } from './keyword-rules'
import { writeClassificationLogs, type ClassificationLogEntry } from './classification-logger'
import { trackCost, type TokenUsageAccum } from './cost-tracker'

const MAX_BATCH = 10
const RAG_EXACT_THRESHOLD = 0.80   // exact キャッシュの直接採用ライン（LLM分類結果を再利用）
const RAG_DIRECT_THRESHOLD = 0.88  // ベクトル検索で直接採用するライン
const RAG_RERANK_THRESHOLD = 0.65  // LLM rerank の候補として使う下限
const RAG_TOPK = 3                 // ベクトル検索の候補数

const BAD_CATEGORY_NAMES = new Set(['未分類', 'その他', '不明', 'unknown', 'other'])

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
  } catch { return [] }
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
  } catch { return [] }
  if (!parsed.success) return []

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
  } catch { return [] }
}

// ===== Upsert Categories =====

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
    const { data: created } = await supabase
      .from('categories')
      .insert(toCreate.map((name) => ({ name, household_id: householdId })))
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
}

// ===== classifyTransactions =====
// Pipeline: corrections → exact cache → vector top-k → LLM rerank (ambiguous) → full LLM (no candidates)

export async function classifyTransactions(
  items: ClassifyItem[],
  householdId: string,
  supabase: SupabaseClient
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
  const payeeKeysForCache = itemsAfterCorrections.map((it) => normalizeKeyword(it.payee))
  const { data: ragRows } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeysForCache)

  const exactCacheMap = new Map<string, { category_id: string; confidence: number }>()
  for (const row of ragRows ?? []) {
    if ((row.confidence ?? 0) >= RAG_EXACT_THRESHOLD) {
      exactCacheMap.set(row.payee_key, { category_id: row.category_id, confidence: row.confidence })
    }
  }

  const itemsAfterExactCache: ClassifyItem[] = []
  for (const item of itemsAfterCorrections) {
    const cached = exactCacheMap.get(normalizeKeyword(item.payee))
    if (cached) {
      categoryIdMap.set(item.index, cached.category_id)
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: normalizeKeyword(item.payee),
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
      remaining.push(item)
    }
  }

  if (!remaining.length) {
    void writeClassificationLogs(logs, supabase)
    return { categoryIdMap }
  }

  // ③ Embeddings（vector search と cache 保存で共用）
  let remainingEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      remainingEmbeddings = await embedTextsWithCache(remaining.map((it) => normalizeKeyword(it.payee)), supabase)
    } catch { /* embedding 失敗は無視 */ }
  }

  const vecCandidates = await vectorSearchTopK(remaining, remainingEmbeddings, householdId, supabase)

  const ragUpserts: RagUpsert[] = []
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
      const idx = remaining.indexOf(item)
      ragUpserts.push({
        household_id: householdId,
        payee_key: normalizeKeyword(item.payee),
        category_id: best.category_id,
        confidence: best.similarity,
        embedding: remainingEmbeddings[idx] ?? null,
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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
        const item = remaining.find((it) => it.index === r.index)
        if (item) {
          const idx = remaining.indexOf(item)
          const bestSim = vecCandidates.get(item.index)?.[0]?.similarity
          ragUpserts.push({
            household_id: householdId,
            payee_key: normalizeKeyword(item.payee),
            category_id: r.category_id,
            confidence: r.confidence,
            embedding: remainingEmbeddings[idx] ?? null,
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
          const item = remaining.find((it) => it.index === ri.index)
          if (item) needsLLM.push(item)
        }
      }
    } catch {
      // rerank 全体失敗 → full LLM にフォールバック
      for (const ri of needsRerank) {
        const item = remaining.find((it) => it.index === ri.index)
        if (item) needsLLM.push(item)
      }
    }
  }

  // ④ Full LLM Classification
  for (let i = 0; i < needsLLM.length; i += MAX_BATCH) {
    const batch = needsLLM.slice(i, i + MAX_BATCH)
    try {
      const classified = await callHaiku(batch, categoryMap, client, hierarchyCategoryList, tokenAccum)
      const resolvedByLLM = new Set(classified.map((c) => c.index))
      for (const c of classified) {
        categoryIdMap.set(c.index, c.category_id)
        const item = remaining.find((it) => it.index === c.index)
        if (item) {
          const idx = remaining.indexOf(item)
          ragUpserts.push({
            household_id: householdId,
            payee_key: normalizeKeyword(item.payee),
            category_id: c.category_id,
            confidence: c.confidence,
            embedding: remainingEmbeddings[idx] ?? null,
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

  if (ragUpserts.length) {
    const { error: ragErr } = await supabase
      .from('category_rag')
      .upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
    if (ragErr) console.error('[classifier] category_rag upsert failed:', ragErr.message)
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
  supabase: SupabaseClient
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
  const payeeKeysForCache = itemsAfterCorrections.map((it) => normalizeKeyword(it.payee))
  const { data: ragRowsFree } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeysForCache)

  const exactCacheMapFree = new Map<string, { category_id: string; confidence: number }>()
  for (const row of ragRowsFree ?? []) {
    if ((row.confidence ?? 0) >= RAG_EXACT_THRESHOLD) {
      exactCacheMapFree.set(row.payee_key, { category_id: row.category_id, confidence: row.confidence })
    }
  }

  const itemsAfterExactCache: ClassifyItem[] = []
  for (const item of itemsAfterCorrections) {
    const payeeKey = normalizeKeyword(item.payee)
    const cached = exactCacheMapFree.get(payeeKey)
    if (cached) {
      categoryIdMap.set(item.index, cached.category_id)
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
      remaining.push(item)
    }
  }

  if (!remaining.length) {
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // ③ Embeddings（共用）
  let remainingEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      remainingEmbeddings = await embedTextsWithCache(remaining.map((it) => normalizeKeyword(it.payee)), supabase)
    } catch { /* 無視 */ }
  }

  const vecCandidates = await vectorSearchTopK(remaining, remainingEmbeddings, householdId, supabase)
  const ragUpserts: RagUpsert[] = []
  const needsLLM: ClassifyItem[] = []

  for (const item of remaining) {
    const rawCandidates = vecCandidates.get(item.index)
    const candidates = rawCandidates?.filter(
      (c) => !BAD_CATEGORY_NAMES.has(existingIdToName.get(c.category_id) ?? '')
    )
    const best = candidates?.[0]
    if (best && best.similarity >= RAG_DIRECT_THRESHOLD) {
      categoryIdMap.set(item.index, best.category_id)
      const idx = remaining.indexOf(item)
      ragUpserts.push({
        household_id: householdId,
        payee_key: normalizeKeyword(item.payee),
        category_id: best.category_id,
        confidence: best.similarity,
        embedding: remainingEmbeddings[idx] ?? null,
      })
      logs.push({
        household_id: householdId,
        payee: item.payee,
        payee_key: normalizeKeyword(item.payee),
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
    if (ragUpserts.length) {
      const { error: ragErr } = await supabase.from('category_rag').upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
      if (ragErr) console.error('[classifier] category_rag upsert failed:', ragErr.message)
    }
    void writeClassificationLogs(logs, supabase)
    return categoryIdMap
  }

  // ④ AI freeform
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const allNamed: Array<{ index: number; categoryName: string }> = []

  for (let i = 0; i < needsLLM.length; i += MAX_BATCH) {
    const batch = needsLLM.slice(i, i + MAX_BATCH)
    try {
      allNamed.push(...await callHaikuFreeForm(batch, client, tokenAccum))
    } catch { /* バッチ失敗はスキップ */ }
  }

  if (!allNamed.length) {
    if (ragUpserts.length) {
      const { error: ragErr } = await supabase.from('category_rag').upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
      if (ragErr) console.error('[classifier] category_rag upsert failed:', ragErr.message)
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
    const item = needsLLM.find((it) => it.index === index)
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
      const idx = remaining.indexOf(item)
      ragUpserts.push({
        household_id: householdId,
        payee_key: normalizeKeyword(item.payee),
        category_id: catId,
        confidence: 0.9,
        embedding: remainingEmbeddings[idx] ?? null,
      })
    }
  }

  // LLM が解決できなかった分は failed ログ
  for (const item of needsLLM) {
    if (!resolvedLLM.has(item.index)) {
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

  if (ragUpserts.length) {
    const { error: ragErr } = await supabase.from('category_rag').upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
    if (ragErr) console.error('[classifier] category_rag upsert failed:', ragErr.message)
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
