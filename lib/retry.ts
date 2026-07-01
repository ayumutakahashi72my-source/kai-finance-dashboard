interface RetryOptions {
  maxRetries?: number
  /** false を返すとその場で即リスロー（リトライしない） */
  shouldRetry?: (err: unknown) => boolean
}

/**
 * AI外部API（Anthropic / Voyage）向けの共通リトライ判定（R-5）。
 * - status あり: 408 / 429 / 5xx のみリトライ（4xx バリデーション系は即失敗）
 * - status なし: ネットワーク層のエラーとみなしてリトライ
 */
export function isRetryableHttpError(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status >= 500
  }
  return true
}

// exponential backoff: 1s → 2s → 4s
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { maxRetries = 3, shouldRetry }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (shouldRetry && !shouldRetry(err)) throw err
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}
