import { describe, it, expect } from 'vitest'
import { parseMfCsv, buildSourceHash, decodeCsvBuffer } from '../lib/csv-parser'

const SAMPLE_CSV = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
2026/05/01,セブンイレブン,-1200,三菱UFJ銀行,食費,食料品,,FALSE,abc001
2026/05/02,給与,250000,三菱UFJ銀行,収入,給与,,FALSE,abc002
2026/05/03,Suica チャージ,-3000,Suica,交通費,電車,,FALSE,abc003
2026/05/04,振替テスト,-1000,テスト銀行,その他,その他,,TRUE,abc004
`

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
    const bad = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n,,−1000,銀行,食費,食料品,,FALSE,xxx\n`
    const { errors } = parseMfCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('日付形式が不正な行はエラーを追加する', () => {
    const bad = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n2026-05-01,テスト,-100,銀行,食費,,,,xxx\n`
    const { errors } = parseMfCsv(bad)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('先頭にメタ行（空行）がある CSV を正常にパースする', () => {
    const withMeta = `\n\n日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID\n2026/05/01,テスト,-500,銀行,食費,食料品,,FALSE,x1\n`
    const { rows, errors } = parseMfCsv(withMeta)
    expect(rows).toHaveLength(1)
    expect(errors).toHaveLength(0)
  })

  it('金額（円）の括弧表記ゆれを吸収する', () => {
    const alt = `日付,内容,金額(円),保有金融機関,大項目,中項目,メモ,振替,ID\n2026/05/01,テスト,-500,銀行,食費,食料品,,FALSE,x1\n`
    const { rows } = parseMfCsv(alt)
    expect(rows).toHaveLength(1)
    expect(rows[0].amount).toBe(-500)
  })
})

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
})

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
})
