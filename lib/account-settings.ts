import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllTransactions, normalizePayee } from '@/lib/duplicate-analyzer'

export type AccountSummary = {
  source_account: string
  txCount: number          // その口座の取引数
  excludedTxCount: number  // うち excluded=true の数
  settingExcluded: boolean // account_settings での除外宣言
  cardLikeCount: number    // カード引き落とし系キーワードを含む取引数
  suggestExclude: boolean  // 集計除外候補か
}

// カード引き落とし系キーワード（正規化後に判定）
const CARD_WITHDRAWAL_KEYWORDS = [
  'カード', 'ご利用代金', '利用代金', '引落', '引き落', 'リボ', 'クレジット',
]

/** payee がカード引き落とし系か。NFKC正規化後に includes 判定。 */
export function isCardWithdrawalPayee(payee: string): boolean {
  const norm = normalizePayee(payee)
  return CARD_WITHDRAWAL_KEYWORDS.some((kw) => norm.includes(normalizePayee(kw)))
}

/** 世帯の口座一覧 + 集計状態 + 除外候補提案を返す（GET 用）。 */
export async function listAccountSummaries(
  householdId: string,
  supabase: SupabaseClient,
): Promise<AccountSummary[]> {
  const txns = await fetchAllTransactions(householdId, supabase)

  const { data: settings } = await supabase
    .from('account_settings')
    .select('source_account, excluded')
    .eq('household_id', householdId)

  const settingMap = new Map<string, boolean>()
  for (const s of (settings as Array<{ source_account: string; excluded: boolean }>) ?? []) {
    settingMap.set(s.source_account, s.excluded)
  }

  // source_account ごとに集計
  const map = new Map<string, AccountSummary>()
  for (const tx of txns) {
    const acc = tx.source_account
    if (!acc) continue // 口座不明の取引は対象外
    const cur = map.get(acc) ?? {
      source_account: acc,
      txCount: 0,
      excludedTxCount: 0,
      settingExcluded: settingMap.get(acc) ?? false,
      cardLikeCount: 0,
      suggestExclude: false,
    }
    cur.txCount += 1
    if (tx.excluded) cur.excludedTxCount += 1
    if (isCardWithdrawalPayee(tx.payee)) cur.cardLikeCount += 1
    map.set(acc, cur)
  }

  // 除外候補判定: カード引落系が口座取引の3割以上かつ未除外宣言
  const result = [...map.values()].map((s) => ({
    ...s,
    suggestExclude: !s.settingExcluded && s.txCount > 0 && s.cardLikeCount / s.txCount >= 0.3,
  }))

  // 取引数の多い順
  result.sort((a, b) => b.txCount - a.txCount)
  return result
}

/**
 * account_settings の除外宣言を transactions.excluded へ同期する（reason='account'）。
 *  - settingExcluded=true の口座 → その口座の未除外取引を excluded=true, reason='account'
 *  - settingExcluded=false の口座 → reason='account' の行のみ excluded=false, reason=NULL
 *    （重複・手動除外 reason='duplicate'/'manual' は保護される）
 */
export async function applyAccountExclusions(
  householdId: string,
  supabase: SupabaseClient,
): Promise<{ excluded: number; restored: number }> {
  const { data: settings } = await supabase
    .from('account_settings')
    .select('source_account, excluded')
    .eq('household_id', householdId)

  const rows = (settings as Array<{ source_account: string; excluded: boolean }>) ?? []
  if (!rows.length) return { excluded: 0, restored: 0 }

  const toExcludeAccounts = rows.filter((r) => r.excluded).map((r) => r.source_account)
  const toRestoreAccounts = rows.filter((r) => !r.excluded).map((r) => r.source_account)

  let excluded = 0
  let restored = 0

  // 除外: 該当口座の未除外取引を excluded=true, reason='account'
  if (toExcludeAccounts.length) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ excluded: true, excluded_reason: 'account' })
      .eq('household_id', householdId)
      .eq('excluded', false)
      .in('source_account', toExcludeAccounts)
      .select('id')
    if (!error) excluded = data?.length ?? 0
  }

  // 戻し: 口座由来(reason='account')の除外のみ解除
  if (toRestoreAccounts.length) {
    const { data, error } = await supabase
      .from('transactions')
      .update({ excluded: false, excluded_reason: null })
      .eq('household_id', householdId)
      .eq('excluded', true)
      .eq('excluded_reason', 'account')
      .in('source_account', toRestoreAccounts)
      .select('id')
    if (!error) restored = data?.length ?? 0
  }

  return { excluded, restored }
}
