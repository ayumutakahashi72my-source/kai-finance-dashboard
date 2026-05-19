/**
 * 月末支出予測（純算術、AI 不要）
 * 現在までの消費ペースを月末まで延長した推定値を返す。
 */
export interface MonthEndForecast {
  forecast: number      // 月末時点の予測支出（円）
  pacePct: number       // 月内経過率 (0-100)
  daysElapsed: number
  daysInMonth: number
}

export function forecastMonthEnd(
  currentExpense: number,
  now: Date = new Date()
): MonthEndForecast {
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysElapsed = now.getDate()

  if (daysElapsed === 0 || currentExpense === 0) {
    return { forecast: 0, pacePct: 0, daysElapsed, daysInMonth }
  }

  const forecast = Math.round((currentExpense / daysElapsed) * daysInMonth)
  const pacePct = Math.round((daysElapsed / daysInMonth) * 100)
  return { forecast, pacePct, daysElapsed, daysInMonth }
}
