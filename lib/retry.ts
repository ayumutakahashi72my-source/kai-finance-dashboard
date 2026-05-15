interface RetryOptions {
  maxRetries?: number
}

// exponential backoff: 1s → 2s → 4s
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { maxRetries = 3 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}
