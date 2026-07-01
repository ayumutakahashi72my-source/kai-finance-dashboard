import type { SupabaseClient } from '@supabase/supabase-js'

/** payee を正規化（NFKC + 空白除去 + 小文字化）。重複判定の正本。 */
export function normalizePayee(s: string): string {
  return s.normalize('NFKC').replace(/[\s　]+/g, '').toLowerCase()
}

export type ScanTx = {
  id: string
  occurred_on: string
  amount: number
  payee: string
  source_account: string | null
  excluded: boolean
}

type Pattern = { source_account: string; payee_keyword: string }

/**
 * 重複グループのキー。duplicates/route.ts と同一ロジック（符号付き amount）。
 * 符号付きにすることで、同額の支出(-1200)と収入(+1200)を別グループに保つ。
 */
function groupKey(tx: { occurred_on: string; amount: number; payee: string }): string {
  return `${tx.occurred_on}__${tx.amount}__${normalizePayee(tx.payee)}`
}

/**
 * ページネーション付きで世帯の全取引を取得する共通ヘルパー（Supabaseのデフォルト1000行制限を回避）。
 * `select` 句だけを差し替えて再利用できるようにしている。
 */
async function fetchAllPaginated<T>(
  householdId: string,
  supabase: SupabaseClient,
  selectClause: string,
): Promise<T[]> {
  const all: T[] = []
  const CHUNK = 1000
  let from = 0
  // 無限ループ防止の安全上限（10万件）
  while (from < 100_000) {
    const { data } = await supabase
      .from('transactions')
      .select(selectClause)
      .eq('household_id', householdId)
      .order('occurred_on', { ascending: false })
      .order('id', { ascending: false }) // 一意なタイブレーカー: 同日が境界をまたいでも行の漏れ/重複を防ぐ
      .range(from, from + CHUNK - 1)
    if (!data?.length) break
    all.push(...(data as T[]))
    if (data.length < CHUNK) break
    from += CHUNK
  }
  return all
}

/**
 * 世帯の全取引をページネーションで取得（Supabaseのデフォルト1000行制限を回避）。
 */
export async function fetchAllTransactions(
  householdId: string,
  supabase: SupabaseClient,
): Promise<ScanTx[]> {
  return fetchAllPaginated<ScanTx>(
    householdId,
    supabase,
    'id, occurred_on, amount, payee, source_account, excluded',
  )
}

export type ScanTxWithCategory = ScanTx & {
  category_id: string | null
  categories: { name: string; color: string | null; icon: string | null } | null
}

/**
 * 重複チェックUI表示用に、カテゴリ情報を含めて全取引をページネーション取得する。
 */
export async function fetchAllTransactionsWithCategory(
  householdId: string,
  supabase: SupabaseClient,
): Promise<ScanTxWithCategory[]> {
  return fetchAllPaginated<ScanTxWithCategory>(
    householdId,
    supabase,
    'id, occurred_on, amount, payee, source_account, excluded, category_id, categories(name, color, icon)',
  )
}

/** 取引配列を重複グループ（同日・同額・同payee）にまとめる。 */
function buildGroups(txns: ScanTx[]): Map<string, ScanTx[]> {
  const groups = new Map<string, ScanTx[]>()
  for (const tx of txns) {
    const key = groupKey(tx)
    const arr = groups.get(key) ?? []
    arr.push(tx)
    groups.set(key, arr)
  }
  return groups
}

/** 学習済みパターンを取得。 */
async function fetchPatterns(
  householdId: string,
  supabase: SupabaseClient,
): Promise<Pattern[]> {
  const { data } = await supabase
    .from('exclude_patterns')
    .select('source_account, payee_keyword')
    .eq('household_id', householdId)
  return (data as Pattern[]) ?? []
}

/**
 * payee文字列からパターン学習用キーワードを抽出する。
 * カード系キーワードを優先し、それ以外は正規化したpayeeの先頭20文字を使う。
 */
function extractKeyword(payee: string): string {
  const norm = normalizePayee(payee)
  const cardPatterns = ['カード引', 'クレジット', 'card', 'credit', '引落', '引き落']
  for (const kw of cardPatterns) {
    if (norm.includes(kw)) return kw
  }
  return norm.slice(0, 20)
}

/**
 * 取引IDの配列からパターンを学習し、exclude_patterns に保存（hit_count を加算）。
 * バッチSELECT + パターン重複排除 + upsert(RPC)。
 * @returns 学習（upsert）したユニークパターン数
 */
export async function learnExcludePatterns(
  householdId: string,
  transactionIds: string[],
  supabase: SupabaseClient,
): Promise<number> {
  if (!transactionIds.length) return 0

  const { data: txs } = await supabase
    .from('transactions')
    .select('payee, source_account')
    .eq('household_id', householdId)
    .in('id', transactionIds)

  if (!txs?.length) return 0

  // (source_account, keyword) で重複排除してから upsert
  const patterns = new Map<string, Pattern>()
  for (const tx of txs as Array<{ payee: string; source_account: string | null }>) {
    if (!tx.source_account) continue
    const keyword = extractKeyword(tx.payee)
    if (!keyword) continue
    patterns.set(`${tx.source_account}__${keyword}`, {
      source_account: tx.source_account,
      payee_keyword: keyword,
    })
  }

  let learned = 0
  for (const p of patterns.values()) {
    const { error } = await supabase.rpc('upsert_exclude_pattern', {
      p_household_id: householdId,
      p_source_account: p.source_account,
      p_payee_keyword: p.payee_keyword,
    })
    if (!error) learned++
  }
  return learned
}

/** 単一取引からパターン学習（既存呼び出し元の互換ラッパー）。 */
export async function learnExcludePattern(
  householdId: string,
  transactionId: string,
  supabase: SupabaseClient,
): Promise<void> {
  await learnExcludePatterns(householdId, [transactionId], supabase)
}

/**
 * 学習済みパターンに基づき、重複グループ内の取引のみを自動除外する。
 *
 * 重要: パターンにマッチするだけでは除外しない。
 * 「同日・同額・同payeeの重複グループに2件以上 active がある」場合に限り、
 * 1件目を残して 2件目以降のパターンマッチ分を除外する。
 * これにより、ユニークな正常取引（例: 1件しかない手数料）の誤除外を防ぐ。
 */
async function autoExcludeInDuplicateGroups(
  householdId: string,
  supabase: SupabaseClient,
  txns: ScanTx[],
  patterns: Pattern[],
): Promise<number> {
  if (!patterns.length) return 0

  const normalizedPatterns = patterns.map((p) => ({
    source_account: p.source_account,
    keyword: normalizePayee(p.payee_keyword),
  }))

  const groups = buildGroups(txns)
  const toExclude: string[] = []

  for (const group of groups.values()) {
    const active = group.filter((t) => !t.excluded)
    if (active.length < 2) continue // 重複が成立していなければ対象外

    // 1件目は必ず残し、2件目以降のうちパターンマッチを除外
    for (let i = 1; i < active.length; i++) {
      const tx = active[i]
      if (!tx.source_account) continue
      const normPayee = normalizePayee(tx.payee)
      const matched = normalizedPatterns.some(
        (p) => p.source_account === tx.source_account && normPayee.includes(p.keyword),
      )
      if (matched) toExclude.push(tx.id)
    }
  }

  if (!toExclude.length) return 0

  // excluded_reason='duplicate' を必ず付ける（口座復元は reason='account' のみ対象のため、
  // reason なしで除外すると UI 上の区別も復元保護の意図も失われる）
  const { error } = await supabase
    .from('transactions')
    .update({ excluded: true, excluded_reason: 'duplicate' })
    .eq('household_id', householdId)
    .in('id', toExclude)

  if (error) {
    console.error('[duplicate-analyzer] auto-exclude failed:', error.message)
    return 0
  }
  return toExclude.length
}

/**
 * 全取引を1回だけ取得し、
 *  1. 既に除外済みの取引を含む重複グループからパターンを学習
 *  2. 学習済みパターンで重複グループ内の未除外取引を自動除外
 * を行う。MF同期/CSV取込の処理自体は一切変更しない（取込後に呼ぶ）。
 */
export async function scanAndAutoExclude(
  householdId: string,
  supabase: SupabaseClient,
): Promise<{ learned: number; excluded: number }> {
  const txns = await fetchAllTransactions(householdId, supabase)
  if (!txns.length) return { learned: 0, excluded: 0 }

  const groups = buildGroups(txns)

  // 1. 除外済みを含む重複グループから学習対象IDを集める
  const learnIds: string[] = []
  for (const group of groups.values()) {
    const excludedInGroup = group.filter((t) => t.excluded)
    const activeInGroup = group.filter((t) => !t.excluded)
    if (excludedInGroup.length > 0 && activeInGroup.length > 0) {
      learnIds.push(...excludedInGroup.map((t) => t.id))
    }
  }

  const learned = learnIds.length
    ? await learnExcludePatterns(householdId, learnIds, supabase)
    : 0

  // 2. 最新パターンで重複グループ内除外（学習があった場合のみ再取得）
  const patterns = await fetchPatterns(householdId, supabase)
  const excluded = await autoExcludeInDuplicateGroups(householdId, supabase, txns, patterns)

  return { learned, excluded }
}
