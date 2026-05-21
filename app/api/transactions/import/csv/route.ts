import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseMfCsv, buildSourceHash, decodeCsvBuffer } from '@/lib/csv-parser'
import { classifyTransactions, classifyFreeForm, normalizeKeyword, pickCategoryColor, fetchCategoryIcons } from '@/lib/ai-classifier'
import { writeClassificationLogs, type ClassificationLogEntry } from '@/lib/classification-logger'

/** category_hint "食費 / 外食" → "食費"。空・「その他」系は空文字を返す */
function extractMajorCategory(hint: string): string {
  const major = hint.split('/')[0].trim()
  if (!major || /^その他/.test(major)) return ''
  return major
}

/**
 * MF大項目からカテゴリを自動作成し、name→id マップを返す。
 * 新規カテゴリには色とアイコンを付与する。
 */
async function upsertCategoriesByName(
  names: string[],
  householdId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
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

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  if (!membership) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const csvText = decodeCsvBuffer(buffer)
  const { rows, errors: parseErrors } = parseMfCsv(csvText)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'インポート可能な行がありません', parseErrors }, { status: 400 })
  }

  // Step 1: MF 大項目から自動カテゴリ作成
  const hintNames = [
    ...new Set(rows.map((r) => extractMajorCategory(r.category_hint)).filter(Boolean)),
  ]
  const catNameToId = await upsertCategoriesByName(hintNames, membership.household_id, supabase)

  // Step 2: 大項目があれば直接マッピング、ない行はAI待ち
  const categoryIdMap = new Map<number, string>()
  const needsAI: Array<{ index: number; payee: string; category_hint: string }> = []
  const mfHintLogs: ClassificationLogEntry[] = []

  for (let i = 0; i < rows.length; i++) {
    const major = extractMajorCategory(rows[i].category_hint)
    const catId = catNameToId.get(major)
    if (catId) {
      categoryIdMap.set(i, catId)
      mfHintLogs.push({
        household_id: membership.household_id,
        payee: rows[i].payee,
        payee_key: normalizeKeyword(rows[i].payee),
        category_hint: rows[i].category_hint,
        category_id: catId,
        method: 'mf_hint',
        confidence: 0.95,
        is_cache_hit: false,
      })
    } else {
      needsAI.push({ index: i, payee: rows[i].payee, category_hint: rows[i].category_hint })
    }
  }

  // Step 3: 大項目なし・「その他」行は AI が自由にカテゴリを付ける
  if (needsAI.length) {
    const aiMap = await classifyFreeForm(needsAI, membership.household_id, supabase, user.id)
    for (const [idx, catId] of aiMap) categoryIdMap.set(idx, catId)
  }

  // Step 4: MFヒント由来の分類を category_rag に書き込む
  if (mfHintLogs.length > 0) {
    const uniqueByKey = new Map<string, ClassificationLogEntry>()
    for (const e of mfHintLogs) {
      if (!uniqueByKey.has(e.payee_key)) uniqueByKey.set(e.payee_key, e)
    }
    const uniqueEntries = [...uniqueByKey.values()]
    const payeeKeys = uniqueEntries.map((e) => e.payee_key)
    const today = new Date().toISOString().slice(0, 10)

    const { data: existingRag } = await supabase
      .from('category_rag')
      .select('payee_key')
      .eq('household_id', membership.household_id)
      .in('payee_key', payeeKeys)

    const existingKeySet = new Set((existingRag ?? []).map((r) => r.payee_key))

    const toInsert = uniqueEntries.filter((e) => !existingKeySet.has(e.payee_key))
    if (toInsert.length > 0) {
      const { error: ragErr } = await supabase
        .from('category_rag')
        .insert(toInsert.map((e) => ({
          household_id: membership.household_id,
          payee_key: e.payee_key,
          category_id: e.category_id!,
          confidence: 0.95,
          hit_count: 1,
          last_seen: today,
        })))
      if (ragErr) console.error('[csv-import] category_rag insert failed:', ragErr.message)
    }

    const toUpdateKeys = uniqueEntries
      .filter((e) => existingKeySet.has(e.payee_key))
      .map((e) => e.payee_key)
    if (toUpdateKeys.length > 0) {
      await supabase
        .from('category_rag')
        .update({ last_seen: today })
        .eq('household_id', membership.household_id)
        .in('payee_key', toUpdateKeys)
    }

    void writeClassificationLogs(mfHintLogs, supabase)
  }

  const records = rows.map((r, i) => ({
    household_id: membership.household_id,
    occurred_on: r.occurred_on,
    payee: r.payee,
    amount: r.amount,
    source: 'csv' as const,
    source_hash: buildSourceHash(r.raw_id, r.occurred_on, r.amount, r.payee),
    is_fixed: false,
    category_id: categoryIdMap.get(i) ?? null,
  }))

  const { data: inserted, error } = await supabase
    .from('transactions')
    .upsert(records, { onConflict: 'household_id,occurred_on,amount,payee,source_hash', ignoreDuplicates: true })
    .select('id')

  if (error) {
    return NextResponse.json({ error: `インポート失敗: ${error.message}` }, { status: 500 })
  }

  // ignoreDuplicates:true でスキップされた既存行のうち category_id が null のものを更新
  const catToHashes = new Map<string, string[]>()
  for (const [i, catId] of categoryIdMap) {
    const hash = records[i]?.source_hash
    if (!hash) continue
    if (!catToHashes.has(catId)) catToHashes.set(catId, [])
    catToHashes.get(catId)!.push(hash)
  }
  for (const [catId, hashes] of catToHashes) {
    await supabase
      .from('transactions')
      .update({ category_id: catId })
      .eq('household_id', membership.household_id)
      .in('source_hash', hashes)
      .is('category_id', null)
  }

  const insertedCount = inserted?.length ?? 0
  const skippedCount = records.length - insertedCount

  return NextResponse.json({
    inserted: insertedCount,
    skipped: skippedCount,
    classified: categoryIdMap.size,
    categoriesCreated: hintNames.length,
    parseErrors,
  })
}
