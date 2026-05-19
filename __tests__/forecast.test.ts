import { describe, it, expect } from 'vitest'
import { forecastMonthEnd } from '@/lib/forecast'

describe('forecastMonthEnd', () => {
  it('現在 0 円なら予測も 0', () => {
    const r = forecastMonthEnd(0, new Date(2026, 4, 15)) // 5月15日
    expect(r.forecast).toBe(0)
  })

  it('月の半分経過 → 倍の額を予測', () => {
    // 5月（31日）の15日時点で ¥100,000 消費 → 月末予測 ¥206,666
    const r = forecastMonthEnd(100_000, new Date(2026, 4, 15))
    expect(r.daysInMonth).toBe(31)
    expect(r.daysElapsed).toBe(15)
    expect(r.forecast).toBe(Math.round((100_000 / 15) * 31))
    expect(r.pacePct).toBe(Math.round((15 / 31) * 100))
  })

  it('月初（1日）でも div by zero しない', () => {
    const r = forecastMonthEnd(5000, new Date(2026, 4, 1))
    expect(r.forecast).toBe(5000 * 31) // 1日 ¥5,000 → 月末 ¥155,000
  })

  it('月末（最終日）は現在値そのまま', () => {
    const r = forecastMonthEnd(150_000, new Date(2026, 3, 30)) // 4月30日
    expect(r.daysInMonth).toBe(30)
    expect(r.forecast).toBe(150_000)
  })

  it('2月 28日でも正しい日数', () => {
    const r = forecastMonthEnd(50_000, new Date(2026, 1, 14))
    expect(r.daysInMonth).toBe(28)
    expect(r.forecast).toBe(Math.round((50_000 / 14) * 28))
  })
})
