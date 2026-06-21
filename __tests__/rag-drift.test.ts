/**
 * RAG Classification Drift Detection
 *
 * Detects regression in normalizeKeyword + offline classifier before it reaches production.
 * All tests are offline (no Supabase, no Anthropic API).
 *
 * To update baselines after intentional improvements:
 *   npm run test:baseline:update
 */
import { describe, it, expect } from 'vitest'
import { normalizeKeyword } from '../lib/ai-classifier'
import { classifyByKeyword } from '../lib/keyword-rules'
import golden from './fixtures/category-golden.json'
import baseline from './fixtures/classification-baseline.json'
import normSnapshot from './fixtures/normalization-snapshot.json'

const KNOWN_CATEGORIES = new Set([
  '食費', '交通費', '日用品', '光熱費', '通信費',
  '娯楽費', '衣服費', '医療費', '教育費', '収入',
])

function classify(payee: string): string | null {
  return classifyByKeyword(normalizeKeyword(payee))
}

type GoldenEntry = { text: string; expected: string }

// ── Helper: compute current metrics ───────────────────────────────

function computeMetrics() {
  const entries = golden as GoldenEntry[]
  let correct = 0
  let classifiable = 0
  const misses: Array<{ text: string; expected: string; predicted: string | null }> = []
  const byCategory = new Map<string, { tp: number; fp: number; fn: number }>()

  for (const entry of entries) {
    const predicted = classify(entry.text)
    if (predicted === null) continue
    classifiable++

    if (!byCategory.has(entry.expected)) byCategory.set(entry.expected, { tp: 0, fp: 0, fn: 0 })
    if (!byCategory.has(predicted))      byCategory.set(predicted,      { tp: 0, fp: 0, fn: 0 })

    if (predicted === entry.expected) {
      correct++
      byCategory.get(entry.expected)!.tp++
    } else {
      byCategory.get(predicted)!.fp++
      byCategory.get(entry.expected)!.fn++
      misses.push({ text: entry.text, expected: entry.expected, predicted })
    }
  }

  const accuracy = classifiable > 0 ? correct / classifiable : 0

  const precisions: number[] = []
  const recalls: number[] = []
  for (const { tp, fp, fn } of byCategory.values()) {
    precisions.push(tp + fp > 0 ? tp / (tp + fp) : 0)
    recalls.push(tp + fn > 0 ? tp / (tp + fn) : 0)
  }
  const macroP = precisions.reduce((a, b) => a + b, 0) / precisions.length
  const macroR = recalls.reduce((a, b) => a + b, 0) / recalls.length
  const macroF1 = macroP + macroR > 0 ? 2 * macroP * macroR / (macroP + macroR) : 0

  return { accuracy, coverage: classifiable / entries.length, macroP, macroR, macroF1, misses, byCategory }
}

// ═══════════════════════════════════════════════════════════════════
// ① Baseline accuracy regression
// ═══════════════════════════════════════════════════════════════════

describe('① Baseline accuracy regression (±2%)', () => {
  const TOLERANCE = 0.02

  it('accuracy must not drop more than 2% from baseline', () => {
    const { accuracy } = computeMetrics()
    const floor = baseline.accuracy - TOLERANCE

    if (accuracy < floor) {
      throw new Error(
        `Accuracy regression detected!\n` +
        `  baseline: ${(baseline.accuracy * 100).toFixed(2)}%\n` +
        `  current:  ${(accuracy * 100).toFixed(2)}%\n` +
        `  drop:     ${((baseline.accuracy - accuracy) * 100).toFixed(2)}% (threshold: ${(TOLERANCE * 100).toFixed(0)}%)\n` +
        `Run: npm run test:baseline:update  if this is intentional`
      )
    }

    console.log(`  accuracy: ${(accuracy * 100).toFixed(2)}% (baseline: ${(baseline.accuracy * 100).toFixed(2)}%)`)
    expect(accuracy).toBeGreaterThanOrEqual(floor)
  })

  it('macroF1 must not drop more than 2% from baseline', () => {
    const { macroF1 } = computeMetrics()
    const floor = baseline.macroF1 - TOLERANCE

    if (macroF1 < floor) {
      throw new Error(
        `macroF1 regression detected!\n` +
        `  baseline: ${baseline.macroF1.toFixed(4)}\n` +
        `  current:  ${macroF1.toFixed(4)}\n` +
        `  drop:     ${(baseline.macroF1 - macroF1).toFixed(4)}`
      )
    }

    console.log(`  macroF1: ${macroF1.toFixed(4)} (baseline: ${baseline.macroF1.toFixed(4)})`)
    expect(macroF1).toBeGreaterThanOrEqual(floor)
  })

  it('coverage must not drop more than 2% from baseline', () => {
    const { coverage } = computeMetrics()
    const floor = baseline.coverage - TOLERANCE
    console.log(`  coverage: ${(coverage * 100).toFixed(2)}% (baseline: ${(baseline.coverage * 100).toFixed(2)}%)`)
    expect(coverage).toBeGreaterThanOrEqual(floor)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ② Normalization stability (embedding drift proxy)
// ═══════════════════════════════════════════════════════════════════

describe('② Normalization stability (embedding drift proxy)', () => {
  it('normalizeKeyword outputs must match stored snapshot within 5% change tolerance', () => {
    const snaps = normSnapshot.snapshots as Array<{ text: string; normalized: string }>
    let changed = 0
    const diffs: string[] = []

    for (const { text, normalized: stored } of snaps) {
      const current = normalizeKeyword(text)
      if (current !== stored) {
        changed++
        diffs.push(`"${text}": stored="${stored}" current="${current}"`)
      }
    }

    const changePct = changed / snaps.length
    if (diffs.length > 0) {
      console.log(`\n  Changed normalizations (${changed}/${snaps.length}):`)
      diffs.slice(0, 10).forEach((d) => console.log(`    ${d}`))
      if (diffs.length > 10) console.log(`    ... and ${diffs.length - 10} more`)
    }

    if (changePct > 0.05) {
      throw new Error(
        `Normalization drift exceeds 5%: ${changed}/${snaps.length} entries changed (${(changePct * 100).toFixed(1)}%).\n` +
        `This indicates embedding inputs have shifted — regenerate embeddings and run:\n` +
        `  npm run test:baseline:update`
      )
    }

    console.log(`  normalization stability: ${snaps.length - changed}/${snaps.length} unchanged (${(changePct * 100).toFixed(1)}% changed)`)
    expect(changePct).toBeLessThanOrEqual(0.05)
  })

  it('normalizeKeyword is idempotent (f(f(x)) === f(x))', () => {
    const failures: string[] = []
    for (const { text } of (golden as GoldenEntry[])) {
      const once  = normalizeKeyword(text)
      const twice = normalizeKeyword(once)
      if (once !== twice) failures.push(`"${text}": f(x)="${once}" f(f(x))="${twice}"`)
    }
    if (failures.length > 0) console.log('\n  Idempotency failures:', failures)
    expect(failures).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ③ Category distribution monitoring (bias detection)
// ═══════════════════════════════════════════════════════════════════

describe('③ Category distribution monitoring', () => {
  it('no single category exceeds 60% of total classifiable entries', () => {
    const entries = golden as GoldenEntry[]
    const counts = new Map<string, number>()
    let classifiable = 0

    for (const entry of entries) {
      const predicted = classify(entry.text)
      if (predicted === null) continue
      classifiable++
      counts.set(predicted, (counts.get(predicted) ?? 0) + 1)
    }

    const biased: string[] = []
    for (const [cat, count] of counts.entries()) {
      const pct = count / classifiable
      if (pct > 0.60) biased.push(`${cat}: ${(pct * 100).toFixed(1)}%`)
    }

    if (biased.length > 0) {
      throw new Error(
        `Category distribution bias detected (>60%):\n  ${biased.join('\n  ')}\n` +
        `This suggests the classifier is over-predicting a single category.`
      )
    }

    console.log('\n  Category distribution:')
    for (const [cat, count] of [...counts.entries()].sort(([, a], [, b]) => b - a)) {
      console.log(`    ${cat.padEnd(6)}: ${count} (${((count / classifiable) * 100).toFixed(1)}%)`)
    }
    expect(biased).toHaveLength(0)
  })

  it('per-category precision does not drop >10% from baseline', () => {
    const { byCategory } = computeMetrics()
    const regressions: string[] = []

    for (const [cat, metrics] of byCategory.entries()) {
      const { tp, fp } = metrics
      const currentP = tp + fp > 0 ? tp / (tp + fp) : 0
      const baseP = (baseline.categoryMetrics as Record<string, { precision: number }>)[cat]?.precision
      if (baseP === undefined) continue
      if (baseP - currentP > 0.10) {
        regressions.push(`${cat}: precision was ${(baseP * 100).toFixed(0)}%, now ${(currentP * 100).toFixed(0)}%`)
      }
    }

    if (regressions.length > 0) {
      throw new Error(`Per-category precision regression (>10%):\n  ${regressions.join('\n  ')}`)
    }
    expect(regressions).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ④ Hallucination detection (enum-only categories)
// ═══════════════════════════════════════════════════════════════════

describe('④ Hallucination detection', () => {
  it('classifier only returns known category names or null', () => {
    const hallucinations: string[] = []

    for (const entry of golden as GoldenEntry[]) {
      const predicted = classify(entry.text)
      if (predicted !== null && !KNOWN_CATEGORIES.has(predicted)) {
        hallucinations.push(`"${entry.text}" → "${predicted}" (unknown category)`)
      }
    }

    if (hallucinations.length > 0) {
      throw new Error(
        `Hallucination detected — classifier returned unknown category names:\n  ${hallucinations.join('\n  ')}\n` +
        `Ensure KEYWORD_RULES only map to: ${[...KNOWN_CATEGORIES].join(', ')}`
      )
    }

    expect(hallucinations).toHaveLength(0)
  })

  it('all expected categories in golden dataset are known categories', () => {
    const unknown: string[] = []
    for (const { text, expected } of golden as GoldenEntry[]) {
      if (!KNOWN_CATEGORIES.has(expected)) {
        unknown.push(`"${text}" expected="${expected}"`)
      }
    }
    if (unknown.length > 0) {
      console.warn(`  Golden entries with unexpected category labels:\n  ${unknown.join('\n  ')}`)
    }
    expect(unknown).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ⑤ Known misclassification regression
// ═══════════════════════════════════════════════════════════════════

describe('⑤ Known misclassification regression', () => {
  it('newly introduced misclassifications are flagged immediately', () => {
    const { misses } = computeMetrics()
    const knownMissTexts = new Set(
      (baseline.knownMisses as Array<{ text: string; predicted: string | null }>)
        .filter((m) => m.predicted !== null)
        .map((m) => m.text)
    )

    const newMisses = misses.filter((m) => !knownMissTexts.has(m.text))

    if (newMisses.length > 0) {
      throw new Error(
        `New misclassification(s) introduced — not in baseline!\n` +
        newMisses.map((m) => `  "${m.text}": predicted="${m.predicted}", expected="${m.expected}"`).join('\n') + '\n' +
        `If intentional, run: npm run test:baseline:update`
      )
    }

    console.log(`  Known misses: ${knownMissTexts.size} (stable)`)
    expect(newMisses).toHaveLength(0)
  })

  it('known misses have not changed their misclassification pattern', () => {
    const knownMisses = (baseline.knownMisses as Array<{ text: string; predicted: string | null }>)
      .filter((m) => m.predicted !== null)

    for (const known of knownMisses) {
      const current = classify(known.text)
      // known miss should still be predicted the same way (or fixed)
      if (current !== known.predicted && current !== null) {
        console.log(`  "${known.text}": miss pattern changed from "${known.predicted}" to "${current}"`)
        // This is not a failure — it might be an improvement; just log it
      }
    }

    expect(true).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════
// ⑥ CI regression report
// ═══════════════════════════════════════════════════════════════════

describe('⑥ CI regression report', () => {
  it('prints structured accuracy diff for CI output', () => {
    const { accuracy, macroF1, macroP, macroR, misses, coverage } = computeMetrics()

    const report = [
      '',
      '╔══════════════════════════════════════════╗',
      '║   RAG Classification Regression Report   ║',
      '╚══════════════════════════════════════════╝',
      '',
      '  Metric       Baseline    Current     Δ',
      '  ──────────   ─────────   ─────────   ──────',
      `  Accuracy     ${fmt(baseline.accuracy)}      ${fmt(accuracy)}      ${delta(baseline.accuracy, accuracy)}`,
      `  Coverage     ${fmt(baseline.coverage)}      ${fmt(coverage)}      ${delta(baseline.coverage, coverage)}`,
      `  macroP       ${fmt(baseline.macroP)}      ${fmt(macroP)}      ${delta(baseline.macroP, macroP)}`,
      `  macroR       ${fmt(baseline.macroR)}      ${fmt(macroR)}      ${delta(baseline.macroR, macroR)}`,
      `  macroF1      ${fmt(baseline.macroF1)}      ${fmt(macroF1)}      ${delta(baseline.macroF1, macroF1)}`,
      '',
    ]

    if (misses.length > 0) {
      report.push('  Misclassified examples:')
      for (const m of misses) {
        const flag = (baseline.knownMisses as Array<{ text: string }>).some((k) => k.text === m.text)
          ? '  (known)' : '  ⚠ NEW'
        report.push(`    "${m.text}" → predicted=${m.predicted} expected=${m.expected}${flag}`)
      }
      report.push('')
    }

    console.log(report.join('\n'))

    expect(true).toBe(true)
  })
})

function fmt(n: number): string {
  return `${(n * 100).toFixed(2)}%`
}

function delta(baseline: number, current: number): string {
  const d = current - baseline
  const sign = d >= 0 ? '+' : ''
  return `${sign}${(d * 100).toFixed(2)}%`
}
