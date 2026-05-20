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

  // fetchMfTransactions は GET /cf/csv に直接アクセス（CSRF 不要）
  // CSV 形式: 日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID

  function makeCsvRes(csv: string, status = 200): Response {
    const body = csv
    return {
      ok: status >= 200 && status < 300,
      status,
      url: '',
      headers: {
        get: (key: string) => key === 'content-type' ? 'text/csv' : null,
        getSetCookie: () => [],
      },
      text: async () => body,
      json: async () => { throw new Error('not json') },
      arrayBuffer: async () => new TextEncoder().encode(body).buffer,
    } as unknown as Response
  }

  function makeErrorRes(status: number): Response {
    return {
      ok: false,
      status,
      url: '',
      headers: {
        get: () => null,
        getSetCookie: () => [],
      },
      text: async () => '',
      json: async () => { throw new Error('not json') },
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as Response
  }

  const MONTH_CSV = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
2026/05/10,スーパー,-3000,銀行,食費,,,FALSE,tx001`

  it('当月の取引を取得してレコードに変換できる', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(MONTH_CSV))

    const txList = await fetchMfTransactions('session=xxx', 2026, 5)
    const records = buildRecords(txList, 'hid-abc')

    expect(records).toHaveLength(1)
    expect(records[0].occurred_on).toBe('2026-05-10')
    expect(records[0].amount).toBe(-3000)
    expect(records[0].source).toBe('auto')
  })

  it('0件のとき空配列を返し DB upsert をスキップできる', async () => {
    const emptyCsv = '日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID'
    mockFetch.mockResolvedValueOnce(makeCsvRes(emptyCsv))

    const txList = await fetchMfTransactions('session=xxx', 2026, 5)
    expect(txList).toHaveLength(0)

    const records = buildRecords(txList, 'hid-abc')
    expect(records).toHaveLength(0)
  })

  it('セッション切れのとき CSRF エラーをスローする', async () => {
    // 1st attempt (direct GET) → 401
    mockFetch.mockResolvedValueOnce(makeErrorRes(401))
    // CSRF 取得も全候補失敗 (4 URL × 401)
    mockFetch.mockResolvedValueOnce(makeErrorRes(401))
    mockFetch.mockResolvedValueOnce(makeErrorRes(401))
    mockFetch.mockResolvedValueOnce(makeErrorRes(401))
    mockFetch.mockResolvedValueOnce(makeErrorRes(401))

    await expect(fetchMfTransactions('bad-session', 2026, 5))
      .rejects.toThrow('CSRFトークンが見つかりませんでした')
  })

  it('全試行失敗のとき MFデータ取得失敗エラーをスローする', async () => {
    // 1st attempt: returns HTML (not CSV) → triggers CSRF path
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: '',
      headers: { get: (key: string) => key === 'content-type' ? 'text/html' : null, getSetCookie: () => [] },
      text: async () => '<html><meta name="csrf-token" content="tok"></html>',
      arrayBuffer: async () => new TextEncoder().encode('').buffer,
    } as unknown as Response)
    // CSRF fetch succeeds → returns token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: 'https://moneyforward.com/cf',
      headers: { get: (key: string) => key === 'content-type' ? 'text/html' : null, getSetCookie: () => [] },
      text: async () => '<html><meta name="csrf-token" content="tok"></html>',
      arrayBuffer: async () => new TextEncoder().encode('').buffer,
    } as unknown as Response)
    // GET/csrf attempt → HTML again (not CSV)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: '',
      headers: { get: (key: string) => key === 'content-type' ? 'text/html' : null, getSetCookie: () => [] },
      text: async () => '<html>login</html>',
      arrayBuffer: async () => new TextEncoder().encode('').buffer,
    } as unknown as Response)
    // POST/csrf attempt → HTML again
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      url: '',
      headers: { get: (key: string) => key === 'content-type' ? 'text/html' : null, getSetCookie: () => [] },
      text: async () => '<html>login</html>',
      arrayBuffer: async () => new TextEncoder().encode('').buffer,
    } as unknown as Response)

    await expect(fetchMfTransactions('session=xxx', 2026, 5))
      .rejects.toThrow('MFデータ取得失敗（全試行失敗）')
  })
})
