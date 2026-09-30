const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function jstNow(): Date {
  return new Date(Date.now() + JST_OFFSET_MS)
}

export function jstMonthStr(): string {
  const d = jstNow()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function jstDateStr(): string {
  const d = jstNow()
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
}

export function jstHour(): number {
  return jstNow().getUTCHours()
}

export function jstDayOfMonth(): number {
  return jstNow().getUTCDate()
}

export function jstDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function jstToDateKey(date: Date): string {
  const d = new Date(date.getTime() + JST_OFFSET_MS)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function todayJST(): string {
  return jstNow().toISOString().split('T')[0]
}

/** 'YYYY-MM' を表示ラベルに変換（当月なら「今月」、それ以外は「M月」） */
export function monthLabel(month: string): string {
  if (month === jstMonthStr()) return '今月'
  return `${Number(month.slice(5, 7))}月`
}

/** 'YYYY-MM' の日数と経過日数（過去月=全日経過 / 未来月=0日） */
export function monthProgress(month: string): { daysTotal: number; dayElapsed: number; daysLeft: number } {
  const [y, m] = month.split('-').map(Number)
  const daysTotal = jstDaysInMonth(y, m)
  const current = jstMonthStr()
  const dayElapsed = month === current ? jstDayOfMonth() : month < current ? daysTotal : 0
  return { daysTotal, dayElapsed, daysLeft: daysTotal - dayElapsed }
}
