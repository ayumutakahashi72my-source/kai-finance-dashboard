const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 現在日付を JST (UTC+9) で YYYY-MM-DD 形式で返す */
export function todayJST(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().split('T')[0]
}
