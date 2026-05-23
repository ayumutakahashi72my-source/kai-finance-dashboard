interface RetryOptions {
  maxRetries?: number
  /** false を返すとその場で即リスロー（リトライしない） */
  shouldRetry?: (err: unknown) => boolean
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
