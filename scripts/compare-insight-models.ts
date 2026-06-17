/**
 * Haiku vs Sonnet 品質比較スクリプト
 * 同じ analytics データを両モデルに渡して出力・コスト・速度を比較する。
 *
 * 実行: npx tsx scripts/compare-insight-models.ts
 */

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── サンプルデータ（実際の運用に近い値を想定） ──────────────────

const SAMPLE_DATA = {
  summary: {
    total: 4823,
    hitRate: 0.612,
    totalApiCalls: 1872,
    avgLatency: 1840,
    avgConfidence: 0.847,
    avgSimilarity: 0.791,
    failedRate: 0.031,
  },
  methodBreakdown: {
    exact_cache:   2952,
    regex_rule:     614,
    vector_direct:  482,
    vector_rerank:  301,
    llm_full:       325,
    failed:         149,
  },
  cost: {
    totalCostJpy: 1240,
    byFeature: {
      classification:  0.006,
      chat:            0.002,
      monthly_summary: 0.001,
    },
  },
  coverage: {
    golden: { rate: 0.87, misses: ['イオン', 'コープ', 'セブンイレブン'] },
    live: { failedRate: 0.031 },
  },
}

function buildPrompt(d: typeof SAMPLE_DATA): string {
  const methodLines = Object.entries(d.methodBreakdown)
    .sort(([, a], [, b]) => b - a)
    .map(([m, c]) => `  ${m}: ${c}件 (${((c / d.summary.total) * 100).toFixed(1)}%)`)
    .join('\n')

  return `AI分類システムの運用データを分析して、日本語で3〜5点の改善インサイトをください。

## 直近の運用データ
- 総分類件数: ${d.summary.total.toLocaleString()}件
- キャッシュヒット率: ${(d.summary.hitRate * 100).toFixed(1)}%（高いほどコスト削減）
- API呼び出し合計: ${d.summary.totalApiCalls.toLocaleString()}回
- 平均レイテンシ: ${d.summary.avgLatency}ms
- 平均信頼度: ${d.summary.avgConfidence.toFixed(3)}
- 平均類似度(vector経路): ${d.summary.avgSimilarity.toFixed(3)}
- 分類失敗率: ${(d.summary.failedRate * 100).toFixed(1)}%
- 過去30日コスト: ¥${d.cost.totalCostJpy.toLocaleString()}

## 分類メソッド内訳
${methodLines}

## Goldenデータセットカバレッジ
- カバー率: ${(d.coverage.golden.rate * 100).toFixed(1)}%
- 未カバー店舗: ${d.coverage.golden.misses.join('、')}

## 出力形式
- 箇条書き（- で始める）、1点を1〜2文で
- 良い点は✓、要対応は⚠、優先改善は🔴 のプレフィックスをつける
- 数値を引用して具体的に
- 改善アクションを必ず含める`
}

interface ModelResult {
  model: string
  output: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  estimatedCostJpy: number
}

async function runModel(modelId: string, modelLabel: string): Promise<ModelResult> {
  const prompt = buildPrompt(SAMPLE_DATA)
  const start = Date.now()

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const latencyMs = Date.now() - start
  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // 概算コスト（2025年5月時点の価格）
  const pricePerMInput  = modelId.includes('haiku') ? 0.80  : 3.00  // USD per 1M tokens
  const pricePerMOutput = modelId.includes('haiku') ? 4.00  : 15.00
  const costUsd = (response.usage.input_tokens / 1_000_000) * pricePerMInput
                + (response.usage.output_tokens / 1_000_000) * pricePerMOutput
  const estimatedCostJpy = Math.ceil(costUsd * 150)

  return {
    model: modelLabel,
    output: text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs,
    estimatedCostJpy,
  }
}

function printResult(r: ModelResult) {
  const divider = '─'.repeat(60)
  console.log(`\n${divider}`)
  console.log(`▶ ${r.model}`)
  console.log(`  レイテンシ : ${r.latencyMs.toLocaleString()}ms`)
  console.log(`  トークン   : input ${r.inputTokens} / output ${r.outputTokens}`)
  console.log(`  概算コスト : ¥${r.estimatedCostJpy}`)
  console.log(divider)
  console.log(r.output)
}

function printComparison(haiku: ModelResult, sonnet: ModelResult) {
  console.log('\n' + '═'.repeat(60))
  console.log('  比較サマリー')
  console.log('═'.repeat(60))

  const latencyRatio = (sonnet.latencyMs / haiku.latencyMs).toFixed(1)
  const costRatio    = sonnet.estimatedCostJpy > 0
    ? (sonnet.estimatedCostJpy / Math.max(haiku.estimatedCostJpy, 1)).toFixed(1)
    : '∞'

  console.log(`  速度     : Haiku が ${latencyRatio}x 速い`)
  console.log(`  コスト   : Haiku が ${costRatio}x 安い`)
  console.log(`  出力長   : Haiku ${haiku.outputTokens}tok / Sonnet ${sonnet.outputTokens}tok`)
  console.log()

  // 品質の簡易チェック
  const checks = [
    { label: '✓/⚠/🔴 プレフィックスあり', haiku: /[✓⚠🔴]/.test(haiku.output), sonnet: /[✓⚠🔴]/.test(sonnet.output) },
    { label: '数値引用あり',              haiku: /\d+[%件ms]/.test(haiku.output),      sonnet: /\d+[%件ms]/.test(sonnet.output) },
    { label: '改善アクション言及',         haiku: /追加|改善|見直|対応/.test(haiku.output), sonnet: /追加|改善|見直|対応/.test(sonnet.output) },
    { label: '箇条書き（-）形式',         haiku: /^- /m.test(haiku.output),           sonnet: /^- /m.test(sonnet.output) },
  ]

  console.log('  品質チェック:')
  for (const c of checks) {
    const h = c.haiku  ? '✓' : '✗'
    const s = c.sonnet ? '✓' : '✗'
    console.log(`    ${c.label.padEnd(24)} Haiku: ${h}  Sonnet: ${s}`)
  }

  console.log()
  const haikuScore  = checks.filter((c) => c.haiku).length
  const sonnetScore = checks.filter((c) => c.sonnet).length
  console.log(`  スコア: Haiku ${haikuScore}/4 点 vs Sonnet ${sonnetScore}/4 点`)

  if (haikuScore >= sonnetScore) {
    console.log('\n  💡 結論: Haiku で十分な品質です。コスト効率を優先してください。')
  } else {
    console.log(`\n  💡 結論: Sonnet の方が品質が${sonnetScore - haikuScore}点高いです。`)
    console.log('     品質差 vs コスト差を見て判断してください。')
  }
  console.log()
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY が設定されていません')
    process.exit(1)
  }

  console.log('Haiku vs Sonnet インサイト品質比較')
  console.log('同じ analytics データで両モデルを実行します...\n')

  const [haiku, sonnet] = await Promise.all([
    runModel('claude-haiku-4-5-20251001', 'Claude Haiku 4.5'),
    runModel('claude-sonnet-4-6',         'Claude Sonnet 4.6'),
  ])

  printResult(haiku)
  printResult(sonnet)
  printComparison(haiku, sonnet)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
