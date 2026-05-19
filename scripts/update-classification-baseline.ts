/**
 * Regenerates classification baseline and normalization snapshot from the golden dataset.
 *
 * Run after intentional improvements to the classifier or normalizer:
 *   npm run test:baseline:update
 *
 * This script is pure TypeScript with no external dependencies beyond the project.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ── Inline normalizeKeyword (matches lib/ai-classifier.ts exactly) ──

function normalizeKeyword(payee: string): string {
  return payee
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/株式会社|有限会社|合同会社|一般社団法人|公益財団法人/g, '')
    .replace(/[(（]株[)）]|㈱|㈲/g, '')
    .replace(/[0-9]+号?店$/g, '')
    .replace(/(店|支店|営業所|出張所|センター|ショップ|ストア)$/g, '')
    .replace(/[-0-9]+$/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 64)
}

// ── Keyword rules (mirrors category-rag.test.ts / rag-drift.test.ts) ──

const KEYWORD_RULES: Array<{ patterns: RegExp[]; category: string }> = [
  { patterns: [/7.?eleven|seven|ｾﾌﾞﾝ|セブン|ファミリーマート|familymart|ローソン|lawson|コンビニ|ミニストップ|デイリーヤマザキ/], category: '食費' },
  { patterns: [/イオン|aeon|イトーヨーカドー|ito.yokado|西友|seiyu|ライフ|マルエツ|ベルク|サミット|業務スーパー|コストコ|costco/], category: '食費' },
  { patterns: [/吉野家|松屋|すき家|マクドナルド|mcdonald|モスバーガー|mos|スターバックス|starbucks|ドトール|サイゼリヤ|ガスト|デニーズ|denny|くら寿司|はま寿司/], category: '食費' },
  { patterns: [/eneos|出光|idemitsu|コスモ石油|cosmo|昭和シェル|jx/], category: '交通費' },
  { patterns: [/suica|pasmo|icoca|manaca|nimoca|hayakaken|チャージ/], category: '交通費' },
  { patterns: [/東京メトロ|tokyometro|jr|東日本旅客|小田急|odakyu|東急|tokyu|西武|seibu|京急|keikyu|相鉄|sotetsu|京王|keio|タクシー|taxi|駐車場|parking|レンタカー|カーシェア/], category: '交通費' },
  { patterns: [/マツキヨ|matsukiyo|ウエルシア|welcia|ツルハ|tsuruha|カワチ|kawachi|コーナン|cainz|カインズ|ニトリ|nitori|無印|muji|ダイソー|daiso|セリア|seria|キャンドゥ|cando/], category: '日用品' },
  { patterns: [/東京電力|tepco|関西電力|kepco|東京ガス|tokyo.?gas|大阪ガス|osaka.?gas|電力|水道局|下水道/], category: '光熱費' },
  { patterns: [/softbank|ソフトバンク|docomo|ドコモ|au|楽天モバイル|rakutenmobile|ntt|フレッツ|ocn|uq|ymobile/], category: '通信費' },
  { patterns: [/netflix|spotify|amazon.?prime|appletv|disney|unext|steam|nintendo|ニンテンドー|映画|cinema|toho|bookoff|geo|カラオケ|karaoke/], category: '娯楽費' },
  { patterns: [/ユニクロ|uniqlo|gu|zara|hm|しまむら|shimamura|青山|aoyama|abcマート|abcmart/], category: '衣服費' },
  { patterns: [/クリニック|clinic|内科|歯科|眼科|整形|病院|hospital|薬局|pharmacy|調剤|スポーツジム|gym|コナミ|konami/], category: '医療費' },
  { patterns: [/公文|kumon|学研|gakken|進研|英会話|スクール|school|塾|juku|cram/], category: '教育費' },
  { patterns: [/amazon|楽天|rakuten|yahoo|ヤフー/], category: '日用品' },
  { patterns: [/給与|賞与|salary|bonus|振込/], category: '収入' },
]

function classify(payee: string): string | null {
  const n = normalizeKeyword(payee)
  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(n)) return rule.category
    }
  }
  return null
}

// ── Load golden dataset ───────────────────────────────────────────

const FIXTURES = join(__dirname, '..', '__tests__', 'fixtures')
const golden = JSON.parse(readFileSync(join(FIXTURES, 'category-golden.json'), 'utf-8')) as Array<{ text: string; expected: string }>

// ── Compute metrics ──────────────────────────────────────────────

let correct = 0
let classifiable = 0
const misses: Array<{ text: string; expected: string; predicted: string | null; normalized: string; reason: string }> = []
const byCategory = new Map<string, { tp: number; fp: number; fn: number }>()

for (const entry of golden) {
  const predicted = classify(entry.text)
  const normalized = normalizeKeyword(entry.text)

  if (predicted === null) {
    misses.push({ text: entry.text, expected: entry.expected, predicted: null, normalized, reason: 'no rule matched' })
    continue
  }

  classifiable++
  if (!byCategory.has(entry.expected)) byCategory.set(entry.expected, { tp: 0, fp: 0, fn: 0 })
  if (!byCategory.has(predicted))      byCategory.set(predicted, { tp: 0, fp: 0, fn: 0 })

  if (predicted === entry.expected) {
    correct++
    byCategory.get(entry.expected)!.tp++
  } else {
    byCategory.get(predicted)!.fp++
    byCategory.get(entry.expected)!.fn++
    misses.push({ text: entry.text, expected: entry.expected, predicted, normalized, reason: `matched ${predicted} rule instead` })
  }
}

const total = golden.length
const accuracy = classifiable > 0 ? correct / classifiable : 0
const coverage = classifiable / total

const precisions: number[] = []
const recalls: number[] = []
const categoryMetrics: Record<string, { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number }> = {}

for (const [cat, { tp, fp, fn }] of byCategory.entries()) {
  const p = tp + fp > 0 ? tp / (tp + fp) : 0
  const r = tp + fn > 0 ? tp / (tp + fn) : 0
  const f1 = p + r > 0 ? 2 * p * r / (p + r) : 0
  precisions.push(p)
  recalls.push(r)
  categoryMetrics[cat] = { precision: p, recall: r, f1, tp, fp, fn }
}

const macroP  = precisions.reduce((a, b) => a + b, 0) / precisions.length
const macroR  = recalls.reduce((a, b) => a + b, 0) / recalls.length
const macroF1 = macroP + macroR > 0 ? 2 * macroP * macroR / (macroP + macroR) : 0

// ── Write classification-baseline.json ──────────────────────────

const baseline = {
  generatedAt: new Date().toISOString().slice(0, 10),
  description: 'Baseline metrics computed from category-golden.json (offline keyword classifier). Use scripts/update-classification-baseline.ts to regenerate.',
  totalEntries: total,
  classifiableEntries: classifiable,
  accuracy,
  coverage,
  macroP,
  macroR,
  macroF1,
  knownMisses: misses,
  categoryMetrics,
}

writeFileSync(join(FIXTURES, 'classification-baseline.json'), JSON.stringify(baseline, null, 2) + '\n', 'utf-8')
console.log(`✓ classification-baseline.json updated (accuracy: ${(accuracy * 100).toFixed(2)}%, macroF1: ${macroF1.toFixed(4)})`)

// ── Write normalization-snapshot.json ───────────────────────────

const snapshots = golden.map((entry) => ({
  text: entry.text,
  normalized: normalizeKeyword(entry.text),
}))

const snapshot = {
  generatedAt: new Date().toISOString().slice(0, 10),
  description: 'Stored normalizeKeyword outputs for all golden entries. Regenerate with: npm run test:baseline:update',
  snapshots,
}

writeFileSync(join(FIXTURES, 'normalization-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n', 'utf-8')
console.log(`✓ normalization-snapshot.json updated (${snapshots.length} entries)`)

// ── Print summary ────────────────────────────────────────────────

console.log('\nSummary:')
console.log(`  total:        ${total}`)
console.log(`  classifiable: ${classifiable}`)
console.log(`  accuracy:     ${(accuracy * 100).toFixed(2)}%`)
console.log(`  coverage:     ${(coverage * 100).toFixed(2)}%`)
console.log(`  macroP:       ${macroP.toFixed(4)}`)
console.log(`  macroR:       ${macroR.toFixed(4)}`)
console.log(`  macroF1:      ${macroF1.toFixed(4)}`)
if (misses.length > 0) {
  console.log(`  misses (${misses.length}):`)
  misses.forEach((m) => console.log(`    - "${m.text}": predicted=${m.predicted ?? 'null'} (${m.reason})`))
}
