import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizePayee,
  fetchAllTransactions,
  learnExcludePatterns,
  scanAndAutoExclude,
} from '@/lib/duplicate-analyzer'

/**
 * 重複除外の自動学習・自動除外ロジック（lib/duplicate-analyzer.ts）のユニットテスト。
 * 実際の集計を左右するコアロジックのため、Supabaseクライアントをモックして
 * 「学習 → 自動除外」の一連の流れと、誤除外を防ぐガード条件を検証する。
 */

type Resp = { data: unknown; error: { message: string } | null }

/** table名ごとにレスポンスをキューで返す最小限のSupabaseモック。 */
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
    rpc: (name: string, args: unknown) => {
      calls.push({ table: `rpc:${name}`, op: 'rpc', args: [args] })
      return Promise.resolve(nextResp(`rpc:${name}`))
    },
  }

  return { client: client as unknown as SupabaseClient, calls }
}

describe('normalizePayee', () => {
  it('空白（全角/半角）を除去し小文字化する', () => {
    expect(normalizePayee('セブン イレブン')).toBe('セブンイレブン')
    expect(normalizePayee('AMAZON')).toBe('amazon')
    expect(normalizePayee('ＶＩＳＡ　カード')).toBe(normalizePayee('visaカード'))
  })
})

describe('fetchAllTransactions（ページネーション）', () => {
  it('1000件を超える取引を複数ページに分けて漏れなく取得する', async () => {
    const page1 = Array.from({ length: 1000 }, (_, i) => ({
      id: `p1-${i}`, occurred_on: '2026-06-01', amount: -100, payee: 'x', source_account: 'A', excluded: false,
    }))
    const page2 = [
      { id: 'p2-0', occurred_on: '2026-05-01', amount: -200, payee: 'y', source_account: 'A', excluded: false },
    ]
    const { client } = createMockSupabase({
      transactions: [{ data: page1, error: null }, { data: page2, error: null }],
    })

    const result = await fetchAllTransactions('h1', client)
    expect(result).toHaveLength(1001)
    expect(result[1000].id).toBe('p2-0')
  })

  it('取引が1000件未満なら1回のクエリで完結する', async () => {
    const page = [
      { id: 't1', occurred_on: '2026-06-01', amount: -100, payee: 'x', source_account: 'A', excluded: false },
    ]
    const { client, calls } = createMockSupabase({ transactions: [{ data: page, error: null }] })

    const result = await fetchAllTransactions('h1', client)
    expect(result).toHaveLength(1)
    expect(calls.filter((c) => c.op === 'range')).toHaveLength(1)
  })
})

describe('learnExcludePatterns', () => {
  it('カード引落系のキーワードを優先して抽出しパターン学習する', async () => {
    const { client, calls } = createMockSupabase({
      transactions: [{ data: [{ payee: '三井住友カード引落', source_account: '三井住友銀行' }], error: null }],
      'rpc:upsert_exclude_pattern': [{ data: null, error: null }],
    })

    const learned = await learnExcludePatterns('h1', ['tx1'], client)
    expect(learned).toBe(1)

    const rpcCall = calls.find((c) => c.table === 'rpc:upsert_exclude_pattern')
    // cardPatterns の先頭から順にマッチするため「カード引」が優先される
    expect(rpcCall?.args[0]).toMatchObject({
      p_household_id: 'h1',
      p_source_account: '三井住友銀行',
      p_payee_keyword: 'カード引',
    })
  })

  it('source_account が無い取引は学習対象から除外する', async () => {
    const { client, calls } = createMockSupabase({
      transactions: [{ data: [{ payee: '現金', source_account: null }], error: null }],
    })

    const learned = await learnExcludePatterns('h1', ['tx1'], client)
    expect(learned).toBe(0)
    expect(calls.some((c) => c.table.startsWith('rpc:'))).toBe(false)
  })

  it('空のID配列を渡すとDBアクセスせず0を返す', async () => {
    const { client, calls } = createMockSupabase({})
    const learned = await learnExcludePatterns('h1', [], client)
    expect(learned).toBe(0)
    expect(calls).toHaveLength(0)
  })
})

describe('scanAndAutoExclude（学習→自動除外の統合フロー）', () => {
  it('過去に除外済みの重複から学習し、同一グループ内の2件目以降のみを自動除外する', async () => {
    // 同日・同額・同payeeの3件グループ: 1件は既に手動除外済み（学習元）、2件はactive
    const txns = [
      { id: 'tx-old', occurred_on: '2026-06-01', amount: -3000, payee: '楽天カードご利用', source_account: '楽天カード', excluded: true },
      { id: 'tx-a', occurred_on: '2026-06-01', amount: -3000, payee: '楽天カードご利用', source_account: '楽天カード', excluded: false },
      { id: 'tx-b', occurred_on: '2026-06-01', amount: -3000, payee: '楽天カードご利用', source_account: '楽天カード', excluded: false },
    ]

    const { client, calls } = createMockSupabase({
      transactions: [
        { data: txns, error: null }, // fetchAllTransactions
        { data: [{ payee: '楽天カードご利用', source_account: '楽天カード' }], error: null }, // learnExcludePatterns の対象取得
        { data: [{ id: 'tx-b' }], error: null }, // 自動除外 update
      ],
      'rpc:upsert_exclude_pattern': [{ data: null, error: null }],
      exclude_patterns: [{ data: [{ source_account: '楽天カード', payee_keyword: '楽天カードご利用' }], error: null }],
    })

    const result = await scanAndAutoExclude('h1', client)

    expect(result).toEqual({ learned: 1, excluded: 1 })

    // 1件目（tx-a）は残し、2件目（tx-b）のみを除外対象にしていること。
    // transactions テーブルへの .in('id', ...) は learnExcludePatterns（学習対象取得）と
    // 自動除外の update の2回呼ばれるため、update 直後（最後）の呼び出しを見る。
    const updateCall = calls.find((c) => c.table === 'transactions' && c.op === 'update')
    const idInCalls = calls.filter((c) => c.table === 'transactions' && c.op === 'in' && c.args[0] === 'id')
    expect(updateCall?.args[0]).toMatchObject({ excluded: true })
    expect(idInCalls.at(-1)?.args[1]).toEqual(['tx-b'])
  })

  it('重複が成立していない（activeが1件のみの）取引は誤除外しない', async () => {
    const txns = [
      { id: 'tx-unique', occurred_on: '2026-06-01', amount: -3000, payee: '楽天カードご利用', source_account: '楽天カード', excluded: false },
    ]

    const { client } = createMockSupabase({
      transactions: [{ data: txns, error: null }],
      exclude_patterns: [{ data: [{ source_account: '楽天カード', payee_keyword: '楽天カード' }], error: null }],
    })

    const result = await scanAndAutoExclude('h1', client)
    expect(result).toEqual({ learned: 0, excluded: 0 })
  })

  it('取引が0件なら何もせず即座に返す', async () => {
    const { client, calls } = createMockSupabase({ transactions: [{ data: [], error: null }] })
    const result = await scanAndAutoExclude('h1', client)
    expect(result).toEqual({ learned: 0, excluded: 0 })
    expect(calls.filter((c) => c.op === 'rpc')).toHaveLength(0)
  })
})
