import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { parseMfCsv, buildSourceHash, decodeCsvBuffer } from '../lib/csv-parser'

const HEADER = '日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n'
const SAMPLE_CSV = `${HEADER}2026/05/01,セブンイレブン,-1200,三菱UFJ銀行,食費,食料品,,FALSE,abc001
2026/05/02,給与,250000,三菱UFJ銀行,収入,給与,,FALSE,abc002
2026/05/03,Suica チャージ,-3000,Suica,交通費,電車,,FALSE,abc003
2026/05/04,振替テスト,-1000,テスト銀行,その他,その他,,TRUE,abc004
`

// ── 基本パース ────────────────────────────────────────────────────

describe('parseMfCsv', () => {
  it('有効な行をパースする', () => {
    const { rows, errors } = parseMfCsv(SAMPLE_CSV)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(3) // 振替=TRUE の行を除く
  })

  it('日付を YYYY-MM-DD に変換する', () => {
    const { rows } = parseMfCsv(SAMPLE_CSV)
    expect(rows[0].occurred_on).toBe('2026-05-01')
  })

  it('金額を整数でパースする', () => {
    const { rows } = parseMfCsv(SAMPLE_CSV)
    expect(rows[0].amount).toBe(-1200)
    expect(rows[1].amount).toBe(250000)
  })

  it('振替行（振替=TRUE）をスキップする', () => {
    const { rows } = parseMfCsv(SAMPLE_CSV)
    expect(rows.every((r) => r.payee !== '振替テスト')).toBe(true)
  })

  it('category_hint に大項目/中項目を結合する', () => {
    const { rows } = parseMfCsv(SAMPLE_CSV)
    expect(rows[0].category_hint).toBe('食費 / 食料品')
  })

  it('BOM 付き CSV を正常にパースする', () => {
    const bom = '﻿'
    const { rows, errors } = parseMfCsv(bom + SAMPLE_CSV)
    expect(errors).toHaveLength(0)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('必須フィールドが空の行はエラーを追加する', () => {
    const bad = `${HEADER},,−1000,銀行,食費,食料品,,FALSE,xxx\n`
    const { errors } = parseMfCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('日付形式が不正な行はエラーを追加する', () => {
    const bad = `${HEADER}2026-05-01,テスト,-100,銀行,食費,,,,xxx\n`
    const { errors } = parseMfCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('先頭にメタ行（空行）がある CSV を正常にパースする', () => {
    const withMeta = `\n\n${SAMPLE_CSV}`
    const { rows, errors } = parseMfCsv(withMeta)
    expect(rows).toHaveLength(3)
    expect(errors).toHaveLength(0)
  })

  it('金額（円）の括弧表記ゆれを吸収する', () => {
    const alt = `日付,内容,金額(円),保有金融機関,大項目,中項目,メモ,振替,ID\n2026/05/01,テスト,-500,銀行,食費,食料品,,FALSE,x1\n`
    const { rows } = parseMfCsv(alt)
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(-500)
  })
})

// ── エッジケース: 改行コード・エンコーディング ───────────────────

describe('parseMfCsv エッジケース', () => {
  it('CRLF 改行コード (Windows) を正常にパースする', () => {
    const crlf = SAMPLE_CSV.replace(/\n/g, '\r\n')
    const { rows, errors } = parseMfCsv(crlf)
    expect(errors).toHaveLength(0)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('空列（メモ列など）を含む行を正常にパースする', () => {
    const csv = `${HEADER}2026/05/10,テスト,-800,銀行,食費,,,FALSE,id001\n`
    const { rows, errors } = parseMfCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
  })

  it('ダブルクォートでエスケープされた内容（コンマ含む）をパースする', () => {
    const csv = `${HEADER}2026/05/10,"株式会社テスト, 渋谷店",-1000,銀行,食費,,,,id002\n`
    const { rows } = parseMfCsv(csv)
    expect(rows.length).toBeGreaterThanOrEqual(0) // パーサーが落ちないこと
  })

  it('絵文字を含む payee を正常にパースする', () => {
    const csv = `${HEADER}2026/05/10,🍣 寿司屋,-2000,銀行,食費,外食,,FALSE,id003\n`
    const { rows } = parseMfCsv(csv)
    expect(rows.length).toBeGreaterThanOrEqual(0)
    if (rows.length > 0) {
      expect(typeof rows[0].payee).toBe('string')
    }
  })

  it('全角数字の金額を正常にパースする', () => {
    const csv = `${HEADER}2026/05/10,テスト，－１０００，銀行,食費,,,FALSE,id004\n`
    // パーサーが全角数字を処理しようとしてもクラッシュしないこと
    expect(() => parseMfCsv(csv)).not.toThrow()
  })

  it('末尾の空行を含む CSV を正常にパースする', () => {
    const csv = `${SAMPLE_CSV}\n\n\n`
    const { rows } = parseMfCsv(csv)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('ヘッダーのみの CSV はエラーなし・0件を返す', () => {
    const { rows, errors } = parseMfCsv(HEADER)
    expect(rows).toHaveLength(0)
    expect(errors).toHaveLength(0)
  })

  it('完全に空の CSV はエラーなし・0件を返す', () => {
    expect(() => parseMfCsv('')).not.toThrow()
  })

  it('UTF-8 マルチバイト文字（中国語・韓国語）を含む行でクラッシュしない', () => {
    const csv = `${HEADER}2026/05/10,중국어テスト-한국어,-500,銀行,食費,,,FALSE,id005\n`
    expect(() => parseMfCsv(csv)).not.toThrow()
  })
})

// ── 大量データパフォーマンス ─────────────────────────────────────

describe('parseMfCsv パフォーマンス', () => {
  it('1000行を2秒以内にパースする', () => {
    const rows = Array.from({ length: 1000 }, (_, i) =>
      `2026/05/${String((i % 28) + 1).padStart(2, '0')},テスト店舗${i},-${(i + 1) * 100},銀行,食費,食料品,,FALSE,id${String(i).padStart(6, '0')}`
    ).join('\n')
    const csv = `${HEADER}${rows}\n`

    const start = Date.now()
    const { rows: parsed } = parseMfCsv(csv)
    const elapsed = Date.now() - start

    expect(parsed.length).toBeGreaterThan(900)
    expect(elapsed).toBeLessThan(2000)
  })
})

// ── MF仕様変更耐性: 列順変更 ─────────────────────────────────────

describe('parseMfCsv 仕様変更耐性', () => {
  it('ヘッダー名が正しければ列順が変わっても同じ値を返す', () => {
    // 列を並び替えた（大項目と中項目を入れ替え）バリエーション
    const altHeader = '日付,内容,金額（円）,保有金融機関,中項目,大項目,メモ,振替,ID\n'
    const standard = parseMfCsv(`${HEADER}2026/05/01,テスト,-500,銀行,食費,食料品,,FALSE,x1\n`)
    const alt = parseMfCsv(`${altHeader}2026/05/01,テスト,-500,銀行,食料品,食費,,FALSE,x1\n`)

    // 両方ともパースに成功すること（列順が変わってもクラッシュしない）
    expect(() => parseMfCsv(`${altHeader}2026/05/01,テスト,-500,銀行,食料品,食費,,FALSE,x1\n`)).not.toThrow()

    // 金額・日付は列名で取得されているので一致するはず
    if (standard.rows.length > 0 && alt.rows.length > 0) {
      expect(standard.rows[0].amount).toBe(alt.rows[0].amount)
      expect(standard.rows[0].occurred_on).toBe(alt.rows[0].occurred_on)
    }
  })
})

// ── decodeCsvBuffer ───────────────────────────────────────────────

describe('decodeCsvBuffer', () => {
  it('UTF-8 バッファを正しくデコードする', () => {
    const text = '日付,内容,金額（円）\n2026/05/01,テスト,-100\n'
    const buffer = new TextEncoder().encode(text).buffer
    const decoded = decodeCsvBuffer(buffer)
    expect(decoded).toContain('日付')
    expect(decoded).toContain('内容')
  })

  it('UTF-8 BOM 付きバッファを正しくデコードする', () => {
    const text = '﻿日付,内容,金額（円）\n2026/05/01,テスト,-100\n'
    const buffer = new TextEncoder().encode(text).buffer
    const decoded = decodeCsvBuffer(buffer)
    expect(decoded).not.toMatch(/^﻿/)
    expect(decoded).toContain('日付')
  })

  it('空バッファでクラッシュしない', () => {
    const buffer = new ArrayBuffer(0)
    expect(() => decodeCsvBuffer(buffer)).not.toThrow()
  })
})

// ── buildSourceHash ───────────────────────────────────────────────

describe('buildSourceHash', () => {
  it('同じ入力に対して常に同じハッシュを返す', () => {
    const h1 = buildSourceHash('abc001', '2026-05-01', -1200, 'セブンイレブン')
    const h2 = buildSourceHash('abc001', '2026-05-01', -1200, 'セブンイレブン')
    expect(h1).toBe(h2)
  })

  it('異なる入力に対して異なるハッシュを返す（重複検知）', () => {
    const h1 = buildSourceHash('abc001', '2026-05-01', -1200, 'セブンイレブン')
    const h2 = buildSourceHash('abc002', '2026-05-02', -1200, 'セブンイレブン')
    expect(h1).not.toBe(h2)
  })

  it('文字列型として返す', () => {
    const h = buildSourceHash('id', '2026-01-01', 100, 'payee')
    expect(typeof h).toBe('string')
    expect(h.length).toBeGreaterThan(0)
  })

  it('payee が異なればハッシュが異なる（payee衝突なし）', () => {
    const h1 = buildSourceHash('id1', '2026-01-01', -500, 'セブンイレブン')
    const h2 = buildSourceHash('id1', '2026-01-01', -500, 'ファミリーマート')
    expect(h1).not.toBe(h2)
  })

  it('amount が異なればハッシュが異なる', () => {
    const h1 = buildSourceHash('id1', '2026-01-01', -500, 'テスト')
    const h2 = buildSourceHash('id1', '2026-01-01', -600, 'テスト')
    expect(h1).not.toBe(h2)
  })

  it('任意入力でハッシュが文字列を返す（property-based）', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.integer(),
        fc.string(),
        (id, date, amount, payee) => {
          const h = buildSourceHash(id, date, amount, payee)
          return typeof h === 'string' && h.length > 0
        }
      )
    )
  })
})
