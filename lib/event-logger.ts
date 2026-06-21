type LogLevel = 'error' | 'warn' | 'info'

interface EventLogPayload {
  level?: LogLevel
  category: string
  message: string
  metadata?: Record<string, unknown>
}

const queue: EventLogPayload[] = []
let timer: ReturnType<typeof setTimeout> | undefined

function flush() {
  if (queue.length === 0 || typeof window === 'undefined') return
  const batch = queue.splice(0, queue.length)
  const body = JSON.stringify({ events: batch, url: location.href, userAgent: navigator.userAgent })
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/event-log', new Blob([body], { type: 'application/json' }))
  } else {
    fetch('/api/event-log', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  }
}

function enqueue(payload: EventLogPayload) {
  queue.push(payload)
  if (timer) clearTimeout(timer)
  if (payload.level === 'error' || queue.length >= 10) {
    flush()
  } else {
    timer = setTimeout(flush, 3000)
  }
}

export function logEvent(category: string, message: string, metadata?: Record<string, unknown>) {
  enqueue({ level: 'info', category, message, metadata })
}

export function logWarn(category: string, message: string, metadata?: Record<string, unknown>) {
  enqueue({ level: 'warn', category, message, metadata })
}

export function logError(category: string, message: string, metadata?: Record<string, unknown>) {
  enqueue({ level: 'error', category, message, metadata })
}

export function reportError(error: Error, context?: string) {
  logError('client-error', error.message, {
    name: error.name,
    stack: error.stack?.slice(0, 2000),
    digest: (error as Error & { digest?: string }).digest,
    context,
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flush)
}
