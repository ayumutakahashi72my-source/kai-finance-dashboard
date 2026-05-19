/**
 * Cost Regression Tests
 *
 * Detects changes in API call pressure (proxy for cost) without making real API calls.
 *
 * "API call pressure" = % of transactions that fall through to LLM stage.
 * If the offline classifier can't handle a transaction → it would call Haiku in production.
 *
 * Run: npm test (included in standard test suite)
 * Update baseline: npm run test:baseline:update
 */
import { describe, it, expect } from 'vitest'
import { estimateCostUsd } from '../lib/cost-tracker'
import { normalizeKeyword } from '../lib/ai-classifier'
import { classifyByKeyword } from '../lib/keyword-rules'
import golden from './fixtures/category-golden.json'
import costBaseline from './fixtures/cost-baseline.json'

function isClassifiableOffline(payee: string): boolean {
  return classifyByKeyword(normalizeKeyword(payee)) !== null
}

type GoldenEntry = { text: string; expected: string }

// ═══════════════════════════════════════════════════════════════════
// ① API call pressure regression
// ═══════════════════════════════════════════════════════════════════

describe('① API call pressure (Haiku LLM fallthrough rate)', () => {
  it('LLM fallthrough rate must not increase more than 5% from baseline', () => {
    const entries = golden as GoldenEntry[]
    const llmFallthrough = entries.filter((e) => !isClassifiableOffline(e.text)).length
    const currentPressure = llmFallthrough / entries.length
    const baselinePressure = costBaseline.llmPressure
    const TOLERANCE = 0.05

    const diff = currentPressure - baselinePressure

    if (diff > TOLERANCE) {
      const newFallthroughs = entries
        .filter((e) => !isClassifiableOffline(e.text))
        .map((e) => `"${e.text}" (expected: ${e.expected})`)

      throw new Error(
        `API call pressure regression detected! Cost spike risk.\n` +
        `  baseline: ${(baselinePressure * 100).toFixed(2)}% LLM fallthrough\n` +
        `  current:  ${(currentPressure * 100).toFixed(2)}% LLM fallthrough\n` +
        `  increase: +${(diff * 100).toFixed(2)}% (threshold: ${(TOLERANCE * 100).toFixed(0)}%)\n\n` +
        `  LLM items (${llmFallthrough}):\n` +
        newFallthroughs.map((f) => `    - ${f}`).join('\n') + '\n\n' +
        `  This means more transactions will call Haiku in production (higher cost).\n` +
        `  If intentional, run: npm run test:baseline:update`
      )
    }

    console.log(`  LLM pressure: ${(currentPressure * 100).toFixed(2)}% (baseline: ${(baselinePressure * 100).toFixed(2)}%, Δ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(2)}%)`)
    expect(currentPressure).toBeLessThanOrEqual(baselinePressure + TOLERANCE)
  })

  it('cache hit proxy must not drop more than 5% from baseline', () => {
    const entries = golden as GoldenEntry[]
    const cacheHits = entries.filter((e) => isClassifiableOffline(e.text)).length
    const currentRate = cacheHits / entries.length
    const baselineRate = costBaseline.cacheHitProxy
    const floor = baselineRate - 0.05

    console.log(`  cache hit proxy: ${(currentRate * 100).toFixed(2)}% (baseline: ${(baselineRate * 100).toFixed(2)}%)`)
    expect(currentRate).toBeGreaterThanOrEqual(floor)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ② Model pricing sanity check
// ═══════════════════════════════════════════════════════════════════

describe('② Cost estimation sanity checks', () => {
  it('Haiku: 1M input tokens costs less than $1', () => {
    const cost = estimateCostUsd('claude-haiku-4-5-20251001', 1_000_000, 0)
    expect(cost).toBeLessThan(1.0)
    expect(cost).toBeGreaterThan(0)
  })

  it('Sonnet: 1M input tokens costs less than $5', () => {
    const cost = estimateCostUsd('claude-sonnet-4-6', 1_000_000, 0)
    expect(cost).toBeLessThan(5.0)
    expect(cost).toBeGreaterThan(0)
  })

  it('Sonnet is more expensive than Haiku per token', () => {
    const haiku  = estimateCostUsd('claude-haiku-4-5-20251001', 1_000, 1_000)
    const sonnet = estimateCostUsd('claude-sonnet-4-6', 1_000, 1_000)
    expect(sonnet).toBeGreaterThan(haiku)
  })

  it('typical classification batch costs less than $0.001', () => {
    const { typicalInputTokens, typicalOutputTokens } = costBaseline.estimatedCostPerClassificationBatch
    const cost = estimateCostUsd('claude-haiku-4-5-20251001', typicalInputTokens, typicalOutputTokens)
    expect(cost).toBeLessThan(0.001)
    console.log(`  typical Haiku batch cost: $${cost.toFixed(7)} (${typicalInputTokens} in / ${typicalOutputTokens} out tokens)`)
  })

  it('monthly chat limit (20 calls × typical tokens) stays under ¥2,000', () => {
    const CALLS = 20
    const INPUT_PER_CALL = 4_000   // ~8k context compressed
    const OUTPUT_PER_CALL = 512
    const costUsd = estimateCostUsd('claude-sonnet-4-6', INPUT_PER_CALL * CALLS, OUTPUT_PER_CALL * CALLS)
    const costJpy = Math.ceil(costUsd * 150)

    console.log(`  20 Sonnet chat calls: $${costUsd.toFixed(4)} = ¥${costJpy}`)
    expect(costJpy).toBeLessThan(2000)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ③ Cost regression report (always passes — informational)
// ═══════════════════════════════════════════════════════════════════

describe('③ Cost regression report', () => {
  it('prints CI cost pressure summary', () => {
    const entries = golden as GoldenEntry[]
    const llmFallthrough = entries.filter((e) => !isClassifiableOffline(e.text)).length
    const pressure = llmFallthrough / entries.length

    // Estimate cost for 1,000 transactions at current pressure
    const BATCH_SIZE = 10
    const batchesNeeded = Math.ceil(entries.length * pressure / BATCH_SIZE)
    const costPer1kTransactions = estimateCostUsd(
      'claude-haiku-4-5-20251001',
      costBaseline.estimatedCostPerClassificationBatch.typicalInputTokens * batchesNeeded,
      costBaseline.estimatedCostPerClassificationBatch.typicalOutputTokens * batchesNeeded
    ) * (1_000 / entries.length)

    console.log([
      '',
      '╔═══════════════════════════════════════╗',
      '║     Cost Regression Report            ║',
      '╚═══════════════════════════════════════╝',
      '',
      `  LLM fallthrough:     ${llmFallthrough}/${entries.length} (${(pressure * 100).toFixed(2)}%)`,
      `  Cache hit proxy:     ${entries.length - llmFallthrough}/${entries.length} (${((1 - pressure) * 100).toFixed(2)}%)`,
      `  Est. Haiku cost/1k:  $${costPer1kTransactions.toFixed(6)} (≈¥${Math.ceil(costPer1kTransactions * 150)})`,
      '',
      '  Model pricing (USD/MTok):',
      `    Haiku  input=$0.80  output=$4.00`,
      `    Sonnet input=$3.00  output=$15.00`,
      '',
    ].join('\n'))

    expect(true).toBe(true)
  })
})
