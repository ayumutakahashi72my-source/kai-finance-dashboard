import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isCardWithdrawalPayee, listAccountSummaries, applyAccountExclusions } from '@/lib/account-settings'

type Resp = { data: unknown; error: { message: string } | null }

/** table名ごとにレスポンスをキューで返す最小限のSupabaseモック（duplicate-analyzer.test.ts と同型）。 */
function createMockSupabase(responses: Record<string, Resp[]>) {
  const cursors: Record<string, number> = {}
  const calls: Array<{ table: string; op: string; args: unknown[] }> = []

  function nextResp(table: string): Resp {
    const idx = cursors[table] ?? 0
    cursors[table] = idx + 1
    const arr = responses[table] ?? []
    return arr[Math.min(idx, arr.length - 1)] ?? { data: null, error: null }
  }

  function chain(table: string) {
    const self = {
      select: (...args: unknown[]) => { calls.push({ table, op: 'select', args }); return self },
      eq: (...args: unknown[]) => { calls.push({ table, op: 'eq', args }); return self },
      order: (...args: unknown[]) => { calls.push({ table, op: 'order', args }); return self },
      range: (...args: unknown[]) => { calls.push({ table, op: 'range', args }); return self },
      in: (...args: unknown[]) => { calls.push({ table, op: 'in', args }); return self },
      update: (...args: unknown[]) => { calls.push({ table, op: 'update', args }); return self },
      then: (resolve: (r: Resp) => void) => resolve(nextResp(table)),
    }
    return self
  }

  const client = {
    from: (table: string) => chain(table),
  }

  return { client: client as unknown as SupabaseClient, calls }
}

describe('isCardWithdrawalPayee', () => {
  it('カード引き落とし系の payee は true', () => {
    expect(isCardWithdrawalPayee('カードご利用代金')).toBe(true)
    expect(isCardWithdrawalPayee('三井住友カード引落')).toBe(true)
    expect(isCardWithdrawalPayee('リボ払い')).toBe(true)
    expect(isCardWithdrawalPayee('クレジットカード')).toBe(true)
    expect(isCardWithdrawalPayee('ご利用代金引き落とし')).toBe(true)
  })

  it('通常の店舗 payee は false', () => {
    expect(isCardWithdrawalPayee('セブンイレブン')).toBe(false)
    expect(isCardWithdrawalPayee('AMAZON')).toBe(false)
    expect(isCardWithdrawalPayee('スターバックス')).toBe(false)
  })

  it('全角/半角・空白を跨いで判定する', () => {
    expect(isCardWithdrawalPayee('ＶＩＳＡ　カード　ご利用代金')).toBe(true)
    // 空白は正規化で除去されるため「リ ボ」→「リボ」で一致
    expect(isCardWithdrawalPayee('リ ボ 払い')).toBe(true)
    // 「引き出し」はキーワード「引き落/引落」を含まないので false
    expect(isCardWithdrawalPayee('現金引き出し')).toBe(false)
  })
})

describe('listAccountSummaries', () => {
  it('口座ごとに集計し、カード引落比率が3割以上かつ未除外宣言の口座のみ suggestExclude=true にする', async () => {
    const txns = [
      { id: '1', occurred_on: '2026-06-01', amount: -1000, payee: 'カードご利用代金', source_account: '楽天カード', excluded: false },
      { id: '2', occurred_on: '2026-06-02', amount: -2000, payee: 'カード引落', source_account: '楽天カード', excluded: false },
      { id: '3', occurred_on: '2026-06-03', amount: -3000, payee: 'セブンイレブン', source_account: '楽天カード', excluded: false },
      { id: '4', occurred_on: '2026-06-04', amount: -500, payee: 'セブンイレブン', source_account: '三菱UFJ銀行', excluded: false },
    ]
    const { client } = createMockSupabase({
      transactions: [{ data: txns, error: null }],
      account_settings: [{ data: [], error: null }],
    })

    const result = await listAccountSummaries('h1', client)

    const rakuten = result.find((r) => r.source_account === '楽天カード')
    expect(rakuten).toMatchObject({ txCount: 3, cardLikeCount: 2, suggestExclude: true })

    const mufg = result.find((r) => r.source_account === '三菱UFJ銀行')
    expect(mufg).toMatchObject({ txCount: 1, cardLikeCount: 0, suggestExclude: false })
  })

  it('既に集計除外宣言済みの口座は suggestExclude を出さない', async () => {
    const txns = [
      { id: '1', occurred_on: '2026-06-01', amount: -1000, payee: 'カードご利用代金', source_account: '楽天カード', excluded: true },
    ]
    const { client } = createMockSupabase({
      transactions: [{ data: txns, error: null }],
      account_settings: [{ data: [{ source_account: '楽天カード', excluded: true }], error: null }],
    })

    const result = await listAccountSummaries('h1', client)
    expect(result[0]).toMatchObject({ settingExcluded: true, suggestExclude: false })
  })

  it('source_account が無い取引は集計対象から除外する', async () => {
    const txns = [
      { id: '1', occurred_on: '2026-06-01', amount: -1000, payee: '不明', source_account: null, excluded: false },
    ]
    const { client } = createMockSupabase({
      transactions: [{ data: txns, error: null }],
      account_settings: [{ data: [], error: null }],
    })

    const result = await listAccountSummaries('h1', client)
    expect(result).toHaveLength(0)
  })
})

describe('applyAccountExclusions', () => {
  it('除外宣言口座を集計除外し、解除宣言口座は reason=account の行のみ復元する', async () => {
    const settings = [
      { source_account: 'A', excluded: true },
      { source_account: 'B', excluded: false },
    ]
    const { client, calls } = createMockSupabase({
      account_settings: [{ data: settings, error: null }],
      transactions: [
        { data: [{ id: 't1' }, { id: 't2' }], error: null }, // 除外update
        { data: [{ id: 't3' }], error: null },                // 復元update
      ],
    })

    const result = await applyAccountExclusions('h1', client)
    expect(result).toEqual({ excluded: 2, restored: 1 })

    // 復元側の update が reason='account' の行だけを対象にしていること（手動/重複除外を保護する不変条件）
    const restoreEq = calls.filter(
      (c) => c.table === 'transactions' && c.op === 'eq' && c.args[0] === 'excluded_reason',
    )
    expect(restoreEq).toHaveLength(1)
    expect(restoreEq[0].args[1]).toBe('account')
  })

  it('account_settings が空なら何もせず0件を返す', async () => {
    const { client, calls } = createMockSupabase({ account_settings: [{ data: [], error: null }] })
    const result = await applyAccountExclusions('h1', client)
    expect(result).toEqual({ excluded: 0, restored: 0 })
    expect(calls.filter((c) => c.table === 'transactions')).toHaveLength(0)
  })
})
