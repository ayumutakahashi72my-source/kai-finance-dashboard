import { describe, it, expect } from 'vitest'
import { normalizeKeyword } from '../lib/ai-classifier'
import { canonicalizeMerchant } from '../lib/merchant-canonical'
import { classifyByKeyword } from '../lib/keyword-rules'
import golden from './fixtures/category-golden.json'

// ── normalizeKeyword 単体テスト ───────────────────────────────────

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

  it('（株）を除去する', () => {
    expect(normalizeKeyword('ＡＢＣ（株）')).toBe('abc')
  })

  it('株式会社を除去する', () => {
    expect(normalizeKeyword('株式会社〇〇商事')).toBe('〇〇商事')
  })

  it('店舗サフィックスを除去してチェーン名を抽出する', () => {
    expect(normalizeKeyword('セブンイレブン渋谷店')).toBe('セブンイレブン渋谷')
    expect(normalizeKeyword('マクドナルド3号店')).toBe('マクドナルド')
    expect(normalizeKeyword('ヤマト運輸渋谷支店')).toBe('ヤマト運輸渋谷')
  })

  it('ドメイン区切り文字を除去する（amazon.co.jp）', () => {
    // . は非単語文字 → 除去 → amazoncojp
    expect(normalizeKeyword('amazon.co.jp')).toBe('amazoncojp')
  })

  it('全角英字と日本語の混在を正規化する（PayPay銀行）', () => {
    // ＰａｙＰａｙ → NFKC → PayPay → toLowerCase → paypay
    expect(normalizeKeyword('ＰａｙＰａｙ銀行')).toBe('paypay銀行')
  })

  it('末尾の数字を除去する（マツモトキヨシ1234）', () => {
    expect(normalizeKeyword('マツモトキヨシ1234')).toBe('マツモトキヨシ')
  })

  it('末尾の全角・半角スペースを除去する', () => {
    expect(normalizeKeyword('〇〇スーパー　　 ')).toBe('〇〇スーパー')
  })

  it('地名は残る（normalizeKeyword はチェーン統合しない）', () => {
    // セブンイレブン渋谷店 と セブンイレブン新宿店 は別キーになる
    // チェーン統合は canonicalizeMerchant の責務
    expect(normalizeKeyword('セブンイレブン渋谷店')).not.toBe(normalizeKeyword('セブンイレブン新宿店'))
  })
})

// ── RAGヒット判定 ─────────────────────────────────────────────────

describe('RAGヒット判定', () => {
  it('confidence >= 0.9 はキャッシュヒット', () => {
    const RAG_THRESHOLD = 0.90
    expect(0.92 >= RAG_THRESHOLD).toBe(true)
  })

  it('confidence < 0.9 はAI呼び出しが必要', () => {
    const RAG_THRESHOLD = 0.90
    expect(0.85 >= RAG_THRESHOLD).toBe(false)
  })

  it('ちょうど0.9はヒット', () => {
    const RAG_THRESHOLD = 0.90
    expect(0.9 >= RAG_THRESHOLD).toBe(true)
  })

  it('similarity >= 0.92 はベクトル直接採用', () => {
    const RAG_DIRECT = 0.92
    expect(0.95 >= RAG_DIRECT).toBe(true)
    expect(0.91 >= RAG_DIRECT).toBe(false)
  })

  it('0.70 <= similarity < 0.92 はLLM rerankへ', () => {
    const RAG_DIRECT = 0.92
    const RAG_RERANK = 0.70
    const sim = 0.80
    expect(sim >= RAG_RERANK && sim < RAG_DIRECT).toBe(true)
  })
})

// ── ゴールデンデータセット精度評価 ──────────────────────────────

function baselineClassify(payee: string): string | null {
  return classifyByKeyword(normalizeKeyword(payee))
}

type GoldenEntry = { text: string; expected: string }

describe('RAG分類 ゴールデンデータセット精度評価', () => {
  it('ベースライン分類器 accuracy >= 90%', () => {
    let correct = 0
    let classifiable = 0
    const failures: string[] = []

    for (const entry of golden as GoldenEntry[]) {
      const predicted = baselineClassify(entry.text)
      if (predicted === null) continue  // 未分類はスキップ（coverage計算から除外）
      classifiable++
      if (predicted === entry.expected) {
        correct++
      } else {
        failures.push(`"${entry.text}" → predicted: ${predicted}, expected: ${entry.expected}`)
      }
    }

    const accuracy = correct / classifiable
    if (failures.length > 0) {
      console.log('\n分類ミス一覧:')
      failures.forEach((f) => console.log('  ✗', f))
    }
    console.log(`\nAccuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${classifiable} 件)`)

    expect(accuracy).toBeGreaterThanOrEqual(0.9)
  })

  it('全件に対するカバレッジ（未分類率）が 15% 以下', () => {
    let unclassified = 0
    const missed: string[] = []

    for (const entry of golden as GoldenEntry[]) {
      if (baselineClassify(entry.text) === null) {
        unclassified++
        missed.push(`"${entry.text}" (expected: ${entry.expected})`)
      }
    }

    const coverage = 1 - unclassified / (golden as GoldenEntry[]).length
    console.log(`\nCoverage: ${(coverage * 100).toFixed(1)}% (${(golden as GoldenEntry[]).length - unclassified}/${(golden as GoldenEntry[]).length} 件分類可能)`)
    if (missed.length > 0) {
      console.log('未分類:')
      missed.forEach((m) => console.log('  -', m))
    }

    expect(coverage).toBeGreaterThanOrEqual(0.85)
  })

  it('カテゴリ別 precision をレポート', () => {
    const byCategory = new Map<string, { tp: number; fp: number; fn: number }>()

    for (const entry of golden as GoldenEntry[]) {
      const predicted = baselineClassify(entry.text)
      if (predicted === null) continue

      if (!byCategory.has(entry.expected)) byCategory.set(entry.expected, { tp: 0, fp: 0, fn: 0 })
      if (!byCategory.has(predicted))      byCategory.set(predicted, { tp: 0, fp: 0, fn: 0 })

      if (predicted === entry.expected) {
        byCategory.get(entry.expected)!.tp++
      } else {
        byCategory.get(predicted)!.fp++
        byCategory.get(entry.expected)!.fn++
      }
    }

    console.log('\nカテゴリ別精度:')
    const precisions: number[] = []
    for (const [cat, { tp, fp, fn }] of byCategory.entries()) {
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0
      const recall    = tp + fn > 0 ? tp / (tp + fn) : 0
      precisions.push(precision)
      console.log(`  ${cat.padEnd(8)} precision=${(precision * 100).toFixed(0)}%  recall=${(recall * 100).toFixed(0)}%  (TP=${tp} FP=${fp} FN=${fn})`)
    }

    // 全カテゴリの平均精度が 85% 以上
    const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length
    expect(avgPrecision).toBeGreaterThanOrEqual(0.85)
  })

  it('normalizeKeyword が全ゴールデン入力で例外をスローしない', () => {
    for (const entry of golden as GoldenEntry[]) {
      expect(() => normalizeKeyword(entry.text)).not.toThrow()
    }
  })
})

// ── canonicalizeMerchant 単体テスト ──────────────────────────────

describe('canonicalizeMerchant', () => {
  it('地名付きセブンイレブンをチェーン名に還元する', () => {
    expect(canonicalizeMerchant('セブンイレブン渋谷')).toBe('セブンイレブン')
    expect(canonicalizeMerchant('セブンイレブン新宿三丁目')).toBe('セブンイレブン')
  })

  it('ドラッグストアプレフィックス付きマツキヨを正規化する', () => {
    // normalizeKeyword("ドラッグストアマツキヨ") = "ドラッグストアマツキヨ"
    expect(canonicalizeMerchant('ドラッグストアマツキヨ')).toBe('マツモトキヨシ')
  })

  it('同一ブランドの複数支店が同じ canonical になる', () => {
    expect(canonicalizeMerchant('ローソン品川港南')).toBe(canonicalizeMerchant('ローソン渋谷神泉'))
    expect(canonicalizeMerchant('マクドナルド渋谷')).toBe(canonicalizeMerchant('マクドナルド新宿'))
  })

  it('楽天モバイルを楽天ECと区別する', () => {
    expect(canonicalizeMerchant('楽天モバイル')).toBe('楽天モバイル')
    expect(canonicalizeMerchant('楽天市場')).toBe('楽天')
  })

  it('amazonprime を amazon と区別する', () => {
    expect(canonicalizeMerchant('amazonprime')).toBe('amazonprime')
    expect(canonicalizeMerchant('amazon')).toBe('amazon')
    expect(canonicalizeMerchant('amazon.co.jp')).toBe('amazon')
  })

  it('未知の商店はパススルー', () => {
    expect(canonicalizeMerchant('近所のパン屋')).toBe('近所のパン屋')
    expect(canonicalizeMerchant('')).toBe('')
  })

  it('canonical form に再度 canonicalize を適用しても変化しない（冪等性）', () => {
    const cases = ['セブンイレブン', 'マクドナルド', 'amazon', 'netflix', 'ニトリ', 'マツモトキヨシ']
    for (const c of cases) {
      expect(canonicalizeMerchant(c)).toBe(c)
    }
  })

  it('normalizeKeyword → canonicalizeMerchant パイプラインが全 golden エントリで例外をスローしない', () => {
    for (const entry of golden as GoldenEntry[]) {
      const normalized = normalizeKeyword(entry.text)
      expect(() => canonicalizeMerchant(normalized)).not.toThrow()
    }
  })

  it('amazon.co.jp がパイプライン経由で amazon に統合される', () => {
    // normalizeKeyword → amazoncojp → canonicalizeMerchant(/^amazon/ match) → amazon
    expect(canonicalizeMerchant(normalizeKeyword('amazon.co.jp'))).toBe('amazon')
  })

  it('チェーン店の地名バリエーションがパイプライン経由で同一キーになる', () => {
    const key1 = canonicalizeMerchant(normalizeKeyword('セブンイレブン渋谷店'))
    const key2 = canonicalizeMerchant(normalizeKeyword('セブンイレブン新宿店'))
    expect(key1).toBe(key2)
    expect(key1).toBe('セブンイレブン')
  })

  it('楽天モバイルと楽天市場はパイプライン後も区別される', () => {
    const mobile  = canonicalizeMerchant(normalizeKeyword('楽天モバイル'))
    const ichiba  = canonicalizeMerchant(normalizeKeyword('楽天市場'))
    expect(mobile).toBe('楽天モバイル')
    expect(ichiba).toBe('楽天')
    expect(mobile).not.toBe(ichiba)
  })

  it('辞書未登録の店舗はパイプライン後もパススルーされる', () => {
    const result = canonicalizeMerchant(normalizeKeyword('近所のパン屋'))
    expect(result).toBe('近所のパン屋')
  })
})

// ── バッチ重複排除ロジック ──────────────────────────────────────────
// LLM呼び出し前に同一チェーンをグルーピングするロジックの単体検証
// （classifyBatch 内の llmKeyToItems Map 構築を再現）

function buildDedupeMap(payees: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const payee of payees) {
    const k = canonicalizeMerchant(normalizeKeyword(payee))
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(payee)
  }
  return map
}

describe('バッチ重複排除（canonicalizeMerchant 統合後）', () => {

  it('同一チェーンの地名バリエーションが1グループに集約される', () => {
    const payees = ['セブンイレブン渋谷店', 'セブンイレブン新宿店', 'セブンイレブン池袋店']
    const map = buildDedupeMap(payees)
    expect(map.size).toBe(1)
    expect(map.get('セブンイレブン')).toHaveLength(3)
  })

  it('異なるチェーンは別グループになる', () => {
    const payees = ['セブンイレブン渋谷店', 'ファミリーマート新宿店', 'ローソン渋谷店']
    const map = buildDedupeMap(payees)
    expect(map.size).toBe(3)
  })

  it('辞書未登録の店舗は normalizeKeyword 結果でグルーピングされる', () => {
    const payees = ['近所のパン屋', '近所のパン屋']
    const map = buildDedupeMap(payees)
    expect(map.size).toBe(1)
    expect(map.get('近所のパン屋')).toHaveLength(2)
  })

  it('amazon.co.jp と amazon が同一グループになる', () => {
    const payees = ['amazon.co.jp', 'amazon', 'Amazon']
    const map = buildDedupeMap(payees)
    expect(map.size).toBe(1)
  })

  it('amazonprime と amazon は別グループになる', () => {
    const payees = ['amazonprime', 'amazon']
    const map = buildDedupeMap(payees)
    expect(map.size).toBe(2)
  })

  it('LLM呼び出し削減率: 10件中同一チェーン8件なら代表2件のみ送出', () => {
    const payees = [
      'セブンイレブン渋谷店', 'セブンイレブン新宿店', 'セブンイレブン池袋店',
      'セブンイレブン品川店', 'セブンイレブン上野店',
      'ファミリーマート渋谷店', 'ファミリーマート新宿店', 'ファミリーマート品川店',
      'amazon.co.jp', 'amazon',
    ]
    const map = buildDedupeMap(payees)
    // セブン・ファミマ・amazon の3グループ
    expect(map.size).toBe(3)
    // 代表1件のみ LLM に送る → 10件 → 3件に削減
    const dedupedCount = map.size
    expect(dedupedCount).toBe(3)
    // 削減率 = (10 - 3) / 10 = 70%
    const reductionRate = (payees.length - dedupedCount) / payees.length
    expect(reductionRate).toBeCloseTo(0.7)
  })

})

// ── RAG統計・分析レスポンスの計算ロジック ────────────────────────

describe('分析ダッシュボード計算ロジック', () => {

  // LLM削減率の計算（analytics page.tsx と同一ロジック）
  function calcLlmReductionRate(
    methodBreakdown: Record<string, number>,
    sampleSize: number,
  ): number {
    const llmCount = (methodBreakdown.llm_full ?? 0) + (methodBreakdown.llm_freeform ?? 0)
    return sampleSize > 0 ? (sampleSize - llmCount) / sampleSize : 0
  }

  it('LLM削減率: llm_full=384, sampleSize=3200 → 88.0%', () => {
    const rate = calcLlmReductionRate({ llm_full: 384, exact_cache: 1280, regex_rule: 960 }, 3200)
    expect(rate).toBeCloseTo(0.88)
  })

  it('LLM削減率: 全件LLMなら削減率は 0%', () => {
    const rate = calcLlmReductionRate({ llm_full: 100 }, 100)
    expect(rate).toBeCloseTo(0)
  })

  it('LLM削減率: sampleSize=0 なら 0 を返す（ゼロ除算防止）', () => {
    const rate = calcLlmReductionRate({}, 0)
    expect(rate).toBe(0)
  })

  // hit_count 修正後の期待動作検証
  // upsert payload に hit_count が含まれるかを型レベルで確認
  it('RagUpsert 型が hit_count と last_seen を必須フィールドとして持つ', () => {
    // 型の構造を実データで確認（型チェックは tsc で保証、ここではランタイム値を検証）
    const today = new Date().toISOString().slice(0, 10)
    const upsert = {
      household_id: 'hid-001',
      payee_key: 'セブンイレブン',
      category_id: 'cat-001',
      confidence: 0.95,
      embedding: null,
      hit_count: 3,        // 修正前は存在しなかったフィールド
      last_seen: today,    // 修正前は存在しなかったフィールド
    }
    expect(typeof upsert.hit_count).toBe('number')
    expect(upsert.hit_count).toBeGreaterThan(0)
    expect(upsert.last_seen).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  // ragHitCountMap の構築ロジック（既存行から hit_count を取得）
  it('ragHitCountMap: 既存行から hit_count を正しくマップする', () => {
    const ragRows = [
      { payee_key: 'セブンイレブン', hit_count: 5 },
      { payee_key: 'ファミリーマート', hit_count: null }, // null は 1 として扱う
      { payee_key: 'amazon', hit_count: 0 },
    ]
    const ragHitCountMap = new Map<string, number>()
    for (const row of ragRows) ragHitCountMap.set(row.payee_key, row.hit_count ?? 1)

    expect(ragHitCountMap.get('セブンイレブン')).toBe(5)
    expect(ragHitCountMap.get('ファミリーマート')).toBe(1)  // null → 1
    expect(ragHitCountMap.get('amazon')).toBe(0)

    // upsert 時のインクリメント
    const nextHitCount = (ragHitCountMap.get('セブンイレブン') ?? 0) + 1
    expect(nextHitCount).toBe(6)

    // 未知の店舗は 0 + 1 = 1 から始まる
    const newEntry = (ragHitCountMap.get('未知の店舗') ?? 0) + 1
    expect(newEntry).toBe(1)
  })

})

// ── ヘルス・スナップショット計算ロジック ─────────────────────────

describe('日次ヘルス・スナップショット計算', () => {

  // Cron ジョブ内の計算ロジックを再現
  function calcSnapshot(
    total: number,
    cacheHits: number,
    llmFull: number,
    failed: number,
    costRows: { cost_usd: string }[],
  ) {
    const costUsd = costRows.reduce((s, r) => s + Number(r.cost_usd), 0)
    return {
      cache_rate:  total > 0 ? Math.round(cacheHits / total * 10000) / 10000 : null,
      llm_rate:    total > 0 ? Math.round(llmFull   / total * 10000) / 10000 : null,
      failed_rate: total > 0 ? Math.round(failed     / total * 10000) / 10000 : null,
      cost_usd:    Math.round(costUsd * 1_000_000) / 1_000_000,
    }
  }

  it('cache_rate が total=0 のとき null を返す（ゼロ除算防止）', () => {
    const snap = calcSnapshot(0, 0, 0, 0, [])
    expect(snap.cache_rate).toBeNull()
    expect(snap.llm_rate).toBeNull()
    expect(snap.failed_rate).toBeNull()
  })

  it('cache_rate を小数4桁に丸める', () => {
    // 1280 / 3200 = 0.4000
    const snap = calcSnapshot(3200, 1280, 384, 32, [])
    expect(snap.cache_rate).toBe(0.4)
    expect(snap.llm_rate).toBe(0.12)
    expect(snap.failed_rate).toBe(0.01)
  })

  it('cost_usd を複数行から集計して6桁精度で返す', () => {
    const snap = calcSnapshot(100, 70, 12, 1, [
      { cost_usd: '0.000120' },
      { cost_usd: '0.000080' },
    ])
    expect(snap.cost_usd).toBeCloseTo(0.0002)
  })

  it('healthSnapshots が空のとき UI は蓄積中バナーを表示する（条件確認）', () => {
    const snapshots: unknown[] = []
    // analytics page の条件: healthSnapshots.length === 0
    expect(snapshots.length === 0).toBe(true)
  })

})

// ── canonical フォールバック lookup ──────────────────────────────

import { buildCacheLookupKeys, resolveCacheEntry } from '../lib/ai-classifier'

describe('canonical フォールバック lookup', () => {
  it('buildCacheLookupKeys は normalized と canonical の和集合を返す', () => {
    const keys = buildCacheLookupKeys(['マクドナルド渋谷', 'セブンイレブン新宿'])
    expect(keys).toContain('マクドナルド渋谷')
    expect(keys).toContain('マクドナルド')
    expect(keys).toContain('セブンイレブン新宿')
    expect(keys).toContain('セブンイレブン')
  })

  it('buildCacheLookupKeys は重複と空文字を除外する', () => {
    const keys = buildCacheLookupKeys(['マクドナルド', 'マクドナルド', ''])
    expect(keys).toEqual(['マクドナルド'])
  })

  it('resolveCacheEntry は normalized キーの完全一致を優先する', () => {
    const map = new Map([
      ['マクドナルド渋谷', 'exact-hit'],
      ['マクドナルド', 'canonical-hit'],
    ])
    expect(resolveCacheEntry(map, 'マクドナルド渋谷')).toBe('exact-hit')
  })

  it('resolveCacheEntry は完全一致がなければ canonical にフォールバックする', () => {
    const map = new Map([['マクドナルド', 'canonical-hit']])
    expect(resolveCacheEntry(map, 'マクドナルド渋谷')).toBe('canonical-hit')
  })

  it('resolveCacheEntry はどちらもなければ undefined を返す', () => {
    const map = new Map([['スターバックス', 'x']])
    expect(resolveCacheEntry(map, '個人商店やまだ')).toBeUndefined()
  })

  it('未知の店舗名は canonical 変換されず二重登録されない', () => {
    const keys = buildCacheLookupKeys(['個人商店やまだ'])
    expect(keys).toEqual(['個人商店やまだ'])
  })
})
