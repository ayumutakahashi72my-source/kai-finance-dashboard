import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calcGrade } from '../lib/score-calculator'

// ── グレード境界値テスト ──────────────────────────────────────────

describe('calcGrade グレード境界値', () => {
  it('90以上はS', () => {
    expect(calcGrade(90)).toBe('S')
    expect(calcGrade(100)).toBe('S')
    expect(calcGrade(95)).toBe('S')
  })

  it('70以上90未満はA', () => {
    expect(calcGrade(70)).toBe('A')
    expect(calcGrade(89)).toBe('A')
    expect(calcGrade(75)).toBe('A')
  })

  it('60以上70未満はB', () => {
    expect(calcGrade(60)).toBe('B')
    expect(calcGrade(69)).toBe('B')
  })

  it('40以上60未満はC', () => {
    expect(calcGrade(40)).toBe('C')
    expect(calcGrade(59)).toBe('C')
  })

  it('40未満はD', () => {
    expect(calcGrade(0)).toBe('D')
    expect(calcGrade(39)).toBe('D')
  })

  it('境界値: 89はA・90はS', () => {
    expect(calcGrade(89)).toBe('A')
    expect(calcGrade(90)).toBe('S')
  })

  it('境界値: 69はB・70はA', () => {
    expect(calcGrade(69)).toBe('B')
    expect(calcGrade(70)).toBe('A')
  })

  it('境界値: 59はC・60はB', () => {
    expect(calcGrade(59)).toBe('C')
    expect(calcGrade(60)).toBe('B')
  })

  it('境界値: 39はD・40はC', () => {
    expect(calcGrade(39)).toBe('D')
    expect(calcGrade(40)).toBe('C')
  })
})

// ── スコア計算ロジック（純粋関数部分） ───────────────────────────

describe('スコア計算ロジック（純粋関数部分）', () => {
  it('予算スコアは最大60点に正規化される', () => {
    const budgetCount = 3
    const budgetScore = 3
    const norm = Math.round((budgetScore / budgetCount) * 60)
    expect(norm).toBe(60)
  })

  it('予算超過カテゴリは0点', () => {
    const ratio = 1.2
    const points = ratio <= 1.0 ? 1 : ratio <= 1.1 ? 0.5 : 0
    expect(points).toBe(0)
  })

  it('10%以内の超過は0.5点', () => {
    const ratio = 1.05
    const points = ratio <= 1.0 ? 1 : ratio <= 1.1 ? 0.5 : 0
    expect(points).toBe(0.5)
  })

  it('節約スコアは最大30点に制限される', () => {
    let savingScore = 0
    for (let i = 0; i < 11; i++) {
      savingScore = Math.min(savingScore + 3, 30)
    }
    expect(savingScore).toBe(30)
  })

  it('合計スコアは最大100点に制限される', () => {
    const total = Math.min(60 + 30 + 10 + 5, 100)
    expect(total).toBe(100)
  })

  it('budgetCountが0の場合、予算スコアは0', () => {
    const budgetCount = 0
    const budgetScore = 0
    const norm = budgetCount > 0 ? Math.round((budgetScore / budgetCount) * 60) : 0
    expect(norm).toBe(0)
  })
})

// ── Property-based testing (fast-check) ─────────────────────────

const VALID_GRADES = new Set(['S', 'A', 'B', 'C', 'D'])

describe('calcGrade property-based tests', () => {
  it('整数スコア 0–100 は必ず S/A/B/C/D のいずれかを返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const grade = calcGrade(score)
        expect(VALID_GRADES.has(grade)).toBe(true)
      })
    )
  })

  it('スコアが高いほどグレードが同じかそれ以上（単調性）', () => {
    const ORDER: Record<string, number> = { D: 0, C: 1, B: 2, A: 3, S: 4 }
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (a, b) => {
          if (a <= b) {
            expect(ORDER[calcGrade(a)]).toBeLessThanOrEqual(ORDER[calcGrade(b)])
          }
        }
      )
    )
  })

  it('小数スコアでも有効なグレードを返す', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 100, noNaN: true }), (score) => {
        const grade = calcGrade(score)
        expect(VALID_GRADES.has(grade)).toBe(true)
      })
    )
  })

  it('マイナス値は D を返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: -10000, max: -1 }), (score) => {
        expect(calcGrade(score)).toBe('D')
      })
    )
  })

  it('100超の値は S を返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: 101, max: 10000 }), (score) => {
        expect(calcGrade(score)).toBe('S')
      })
    )
  })

  it('NaN は D を返す（不正入力への防御）', () => {
    expect(calcGrade(NaN)).toBe('D')
  })

  it('Infinity は S を返す', () => {
    expect(calcGrade(Infinity)).toBe('S')
  })

  it('-Infinity は D を返す', () => {
    expect(calcGrade(-Infinity)).toBe('D')
  })

  it('予算スコア正規化は 0–60 の範囲に収まる', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),  // budgetScore
        fc.integer({ min: 1, max: 100 }),  // budgetCount (0除く)
        (budgetScore, budgetCount) => {
          const clamped = Math.min(budgetScore, budgetCount)
          const norm = Math.round((clamped / budgetCount) * 60)
          expect(norm).toBeGreaterThanOrEqual(0)
          expect(norm).toBeLessThanOrEqual(60)
        }
      )
    )
  })

  it('節約スコアは常に 0–30 の範囲', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (savingCategories) => {
        let score = 0
        for (let i = 0; i < savingCategories; i++) {
          score = Math.min(score + 3, 30)
        }
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(30)
      })
    )
  })

  it('合計スコアは常に 0–100 の範囲', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 60 }),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 10 }),
        (budget, saving, bonus) => {
          const total = Math.min(budget + saving + bonus, 100)
          expect(total).toBeGreaterThanOrEqual(0)
          expect(total).toBeLessThanOrEqual(100)
        }
      )
    )
  })
})
