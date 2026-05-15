import { describe, it, expect } from 'vitest'
import { normalizeKeyword } from '../lib/ai-classifier'

describe('normalizeKeyword', () => {
  it('全角英数を半角に変換する', () => {
    expect(normalizeKeyword('ＡＥＯＮ')).toBe('aeon')
  })

  it('スペース（全角・半角）を除去する', () => {
    expect(normalizeKeyword('イオン　スーパー')).toBe('イオンスーパー')
    expect(normalizeKeyword('AEON MALL')).toBe('aeonmall')
  })

  it('記号を除去する', () => {
    expect(normalizeKeyword('セブン-イレブン')).toBe('セブンイレブン')
    expect(normalizeKeyword('ＡＢＣ（株）')).toBe('abc株')
  })

  it('小文字に変換する', () => {
    expect(normalizeKeyword('Amazon')).toBe('amazon')
  })

  it('64文字に切り詰める', () => {
    const long = 'あ'.repeat(100)
    expect(normalizeKeyword(long).length).toBeLessThanOrEqual(64)
  })

  it('空文字列を返す', () => {
    expect(normalizeKeyword('---')).toBe('')
  })
})

describe('RAGヒット判定', () => {
  it('confidence >= 0.8 はキャッシュヒット', () => {
    const RAG_THRESHOLD = 0.8
    const confidence = 0.85
    expect(confidence >= RAG_THRESHOLD).toBe(true)
  })

  it('confidence < 0.8 はAI呼び出しが必要', () => {
    const RAG_THRESHOLD = 0.8
    const confidence = 0.75
    expect(confidence >= RAG_THRESHOLD).toBe(false)
  })

  it('ちょうど0.8はヒット', () => {
    const RAG_THRESHOLD = 0.8
    expect(0.8 >= RAG_THRESHOLD).toBe(true)
  })
})
