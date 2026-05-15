import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildSourceHash } from '../lib/csv-parser'
import { fetchMfTransactions, type MfTransaction } from '../lib/moneyforward-client'

/**
 * 手動取り込み（/api/settings/mf/sync）のコアロジックをユニットテスト。
 * API Route 自体は Supabase・認証に依存するため、
 * その中核となる「MF取引 → DB レコード変換」ロジックを直接検証する。
 */

function buildRecords(
  txList: MfTransaction[],
  householdId: string
) {
  return txList.map((t) => ({
    household_id: householdId,
    occurred_on: t.occurred_on,
    payee: t.payee,
    amount: t.amount,
    source: 'auto' as const,
    source_hash: buildSourceHash(t.raw_id, t.occurred_on, t.amount, t.payee),
    is_fixed: false,
  }))
}

const SAMPLE_TX: MfTransaction[] = [
  { occurred_on: '2026-05-01', payee: 'セブンイレブン', amount: -1200, category_hint: '食費 / 食料品', raw_id: 'tx001' },
  { occurred_on: '2026-05-02', payee: '給与',          amount: 250000, category_hint: '収入 / 給与',   raw_id: 'tx002' },
]

describe('手動取り込み: レコード変換', () => {
  const HID = 'household-uuid-123'

  it('MF取引を DB レコード形式に変換する', () => {
    const records = buildRecords(SAMPLE_TX, HID)
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      household_id: HID,
      occurred_on: '2026-05-01',
      payee: 'セブンイレブン',
      amount: -1200,
      source: 'auto',
      is_fixed: false,
    })
  })

  it('source_hash が生成される（重複検知用）', () => {
    const records = buildRecords(SAMPLE_TX, HID)
    expect(records[0].source_hash).toBeTruthy()
    expect(typeof records[0].source_hash).toBe('string')
  })

  it('同じ取引は同じ source_hash になる（冪等性）', () => {
    const r1 = buildRecords(SAMPLE_TX, HID)
    const r2 = buildRecords(SAMPLE_TX, HID)
    expect(r1[0].source_hash).toBe(r2[0].source_hash)
    expect(r1[1].source_hash).toBe(r2[1].source_hash)
  })

  it('異なる取引は異なる source_hash になる', () => {
    const records = buildRecords(SAMPLE_TX, HID)
    expect(records[0].source_hash).not.toBe(records[1].source_hash)
  })

  it('空リストを渡すと空配列を返す', () => {
    const records = buildRecords([], HID)
    expect(records).toHaveLength(0)
  })
})

describe('手動取り込み: fetchMfTransactions モック', () => {
  const mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)

  beforeEach(() => mockFetch.mockReset())

  // fetchMfTransactions は内部で2回 fetch する:
  //   1) GET /cf → CSRF トークン取得（meta タグ）
  //   2) GET /cf/detail_transactions → 取引データ取得
  const CF_HTML = `<html><head><meta name="csrf-token" content="tok"></head></html>`

  function makeHtmlRes(html: string, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => html,
      json: async () => { throw new Error('not json') },
    } as unknown as Response
  }

  function makeJsonRes(body: unknown, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as unknown as Response
  }

  it('当月の取引を取得してレコードに変換できる', async () => {
    mockFetch.mockResolvedValueOnce(makeHtmlRes(CF_HTML)) // Step1: CSRF
    mockFetch.mockResolvedValueOnce(makeJsonRes({         // Step2: 取引
      transaction_list: [
        { id: 'tx001', date: '2026/05/10', content: 'スーパー', amount: -3000,
          large_category_name: '食費', transfer: false },
      ],
    }))

    const txList = await fetchMfTransactions('session=xxx', 2026, 5)
    const records = buildRecords(txList, 'hid-abc')

    expect(records).toHaveLength(1)
    expect(records[0].occurred_on).toBe('2026-05-10')
    expect(records[0].amount).toBe(-3000)
    expect(records[0].source).toBe('auto')
  })

  it('0件のとき空配列を返し DB upsert をスキップできる', async () => {
    mockFetch.mockResolvedValueOnce(makeHtmlRes(CF_HTML))
    mockFetch.mockResolvedValueOnce(makeJsonRes({ transaction_list: [] }))

    const txList = await fetchMfTransactions('session=xxx', 2026, 5)
    expect(txList).toHaveLength(0)

    const records = buildRecords(txList, 'hid-abc')
    expect(records).toHaveLength(0)
  })

  it('CSRF 取得ページが 401 のとき MFページ取得失敗エラーをスローする', async () => {
    mockFetch.mockResolvedValueOnce(makeHtmlRes('', 401)) // CSRF 取得失敗

    await expect(fetchMfTransactions('bad-session', 2026, 5))
      .rejects.toThrow('MFページ取得失敗: 401')
  })

  it('取引取得が 401 のとき MFデータ取得失敗エラーをスローする', async () => {
    mockFetch.mockResolvedValueOnce(makeHtmlRes(CF_HTML))       // CSRF 成功
    mockFetch.mockResolvedValueOnce(makeJsonRes('Unauthorized', 401)) // 取引取得失敗

    await expect(fetchMfTransactions('session=xxx', 2026, 5))
      .rejects.toThrow('MFデータ取得失敗: 401')
  })
})
