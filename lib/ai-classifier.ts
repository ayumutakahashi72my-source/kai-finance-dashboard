import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ClassificationResponseSchema } from './ai-schemas'
import { embedTexts } from './embedder'

const MAX_BATCH = 10
const RAG_EXACT_THRESHOLD = 0.8   // exact キャッシュの信頼度下限
const RAG_VECTOR_THRESHOLD = 0.85 // ベクトル類似度の下限

export function normalizeKeyword(payee: string): string {
  return payee
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 64)
}

export interface ClassifyItem {
  index: number
  payee: string
  category_hint: string
}

async function fetchCategoryMap(
  supabase: SupabaseClient,
  householdId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('categories')
    .select('id, name')
    .eq('household_id', householdId)
  const map = new Map<string, string>()
  for (const c of data ?? []) map.set(c.name, c.id)
  return map
}

/** 既存カテゴリから選ぶ通常の分類 */
async function callHaiku(
  items: ClassifyItem[],
  categoryMap: Map<string, string>,
  client: Anthropic
): Promise<Array<{ index: number; category_id: string; confidence: number }>> {
  const categoryList = [...categoryMap.keys()].join(', ')
  const inputJson = items.map((it, localIndex) => ({
    index: localIndex,
    payee: it.payee,
    hint: it.category_hint,
  }))

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
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

/** 「その他」・未分類行を自由なカテゴリ名で分類 */
async function callHaikuFreeForm(
  items: ClassifyItem[],
  client: Anthropic
): Promise<Array<{ index: number; categoryName: string }>> {
  const inputJson = items.map((it, localIndex) => ({
    index: localIndex,
    payee: it.payee,
  }))

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
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

/**
 * ベクトル類似検索で近い店舗のキャッシュを引く。
 * VOYAGE_API_KEY がなければスキップして空を返す。
 */
async function vectorSearch(
  items: ClassifyItem[],
  householdId: string,
  supabase: SupabaseClient
): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  if (!process.env.VOYAGE_API_KEY) return result

  let embeddings: number[][]
  try {
    embeddings = await embedTexts(items.map((it) => normalizeKeyword(it.payee)))
  } catch { return result }

  await Promise.all(
    items.map(async (item, i) => {
      const vec = embeddings[i]
      if (!vec) return

      const { data } = await supabase.rpc('match_category_rag', {
        query_embedding: vec,
        p_household_id: householdId,
        match_threshold: RAG_VECTOR_THRESHOLD,
        match_count: 1,
      })

      const hit = data?.[0]
      if (hit) result.set(item.index, hit.category_id)
    })
  )

  return result
}

export interface ClassifyResult {
  categoryIdMap: Map<number, string>
  skipReason?: string
}

/** 既存カテゴリから選んで分類（exact → vector → AI の3段階） */
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

  const categoryMap = await fetchCategoryMap(supabase, householdId)
  if (!categoryMap.size) {
    return { categoryIdMap, skipReason: 'カテゴリが1件も登録されていません' }
  }

  // ① exact キャッシュ
  const payeeKeys = items.map((it) => normalizeKeyword(it.payee))
  const { data: ragRows } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeys)

  const ragMap = new Map<string, { category_id: string; confidence: number }>()
  for (const row of ragRows ?? []) {
    ragMap.set(row.payee_key, { category_id: row.category_id, confidence: row.confidence })
  }

  let remaining: ClassifyItem[] = []
  for (const item of items) {
    const cached = ragMap.get(normalizeKeyword(item.payee))
    if (cached && cached.confidence >= RAG_EXACT_THRESHOLD) {
      categoryIdMap.set(item.index, cached.category_id)
    } else {
      remaining.push(item)
    }
  }

  if (!remaining.length) return { categoryIdMap }

  // ② ベクトル類似検索
  const vecMatched = await vectorSearch(remaining, householdId, supabase)
  for (const [idx, catId] of vecMatched) categoryIdMap.set(idx, catId)
  remaining = remaining.filter((it) => !vecMatched.has(it.index))

  if (!remaining.length) return { categoryIdMap }

  // ③ AI 分類
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const ragUpserts: Array<{
    household_id: string; payee_key: string; category_id: string
    confidence: number; embedding: number[] | null
  }> = []

  // 保存用に embedding を取得（VOYAGE_API_KEY があれば）
  let newEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      newEmbeddings = await embedTexts(remaining.map((it) => normalizeKeyword(it.payee)))
    } catch { /* embedding 失敗は無視 */ }
  }

  for (let i = 0; i < remaining.length; i += MAX_BATCH) {
    const batch = remaining.slice(i, i + MAX_BATCH)
    try {
      const classified = await callHaiku(batch, categoryMap, client)
      for (const c of classified) {
        categoryIdMap.set(c.index, c.category_id)
        const itemIdx = remaining.findIndex((it) => it.index === c.index)
        const item = remaining[itemIdx]
        if (item) {
          ragUpserts.push({
            household_id: householdId,
            payee_key: normalizeKeyword(item.payee),
            category_id: c.category_id,
            confidence: c.confidence,
            embedding: newEmbeddings[itemIdx] ?? null,
          })
        }
      }
    } catch { /* バッチ失敗はスキップ */ }
  }

  if (ragUpserts.length) {
    await supabase
      .from('category_rag')
      .upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
  }

  return { categoryIdMap }
}

/**
 * 「その他」・未分類行を AI が自由にカテゴリ名を付けて分類。
 * exact → vector → AI(freeform) の3段階。
 */
export async function classifyFreeForm(
  items: ClassifyItem[],
  householdId: string,
  supabase: SupabaseClient
): Promise<Map<number, string>> {
  const categoryIdMap = new Map<number, string>()
  if (!items.length) return categoryIdMap

  // ① exact キャッシュ
  const payeeKeys = items.map((it) => normalizeKeyword(it.payee))
  const { data: ragRows } = await supabase
    .from('category_rag')
    .select('payee_key, category_id, confidence')
    .eq('household_id', householdId)
    .in('payee_key', payeeKeys)

  const ragMap = new Map<string, string>()
  for (const row of ragRows ?? []) {
    if (row.confidence >= RAG_EXACT_THRESHOLD) ragMap.set(row.payee_key, row.category_id)
  }

  let remaining: ClassifyItem[] = []
  for (const item of items) {
    const catId = ragMap.get(normalizeKeyword(item.payee))
    if (catId) { categoryIdMap.set(item.index, catId) } else { remaining.push(item) }
  }

  if (!remaining.length) return categoryIdMap

  // ② ベクトル類似検索
  const vecMatched = await vectorSearch(remaining, householdId, supabase)
  for (const [idx, catId] of vecMatched) categoryIdMap.set(idx, catId)
  remaining = remaining.filter((it) => !vecMatched.has(it.index))

  if (!remaining.length || !process.env.ANTHROPIC_API_KEY) return categoryIdMap

  // ③ AI freeform 分類
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const allNamed: Array<{ index: number; categoryName: string }> = []

  for (let i = 0; i < remaining.length; i += MAX_BATCH) {
    const batch = remaining.slice(i, i + MAX_BATCH)
    try {
      allNamed.push(...await callHaikuFreeForm(batch, client))
    } catch { /* バッチ失敗はスキップ */ }
  }

  if (!allNamed.length) return categoryIdMap

  const uniqueNames = [...new Set(allNamed.map((n) => n.categoryName))]
  const nameToId = await upsertCategoriesByName(uniqueNames, householdId, supabase)

  // embedding 取得（保存用）
  let newEmbeddings: number[][] = []
  if (process.env.VOYAGE_API_KEY) {
    try {
      newEmbeddings = await embedTexts(remaining.map((it) => normalizeKeyword(it.payee)))
    } catch { /* 無視 */ }
  }

  const ragUpserts: Array<{
    household_id: string; payee_key: string; category_id: string
    confidence: number; embedding: number[] | null
  }> = []

  for (const { index, categoryName } of allNamed) {
    const catId = nameToId.get(categoryName)
    if (!catId) continue
    categoryIdMap.set(index, catId)
    const itemIdx = remaining.findIndex((it) => it.index === index)
    const item = remaining[itemIdx]
    if (item) {
      ragUpserts.push({
        household_id: householdId,
        payee_key: normalizeKeyword(item.payee),
        category_id: catId,
        confidence: 0.9,
        embedding: newEmbeddings[itemIdx] ?? null,
      })
    }
  }

  if (ragUpserts.length) {
    await supabase
      .from('category_rag')
      .upsert(ragUpserts, { onConflict: 'household_id,payee_key' })
  }

  return categoryIdMap
}
