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
