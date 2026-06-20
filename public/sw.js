// Minimal PWA Service Worker — installability 要件を満たす最小構成
// v3 — fetch handler は no-op（respondWith禁止: Set-Cookieがブラウザに無視されるため）

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// fetch handler の登録だけでPWA installable判定に必要。
// respondWith() を呼ぶとSet-Cookieヘッダーが無視されるため、
// Supabaseセッションリフレッシュが壊れる。絶対に呼ばないこと。
self.addEventListener('fetch', () => {})

// ── Push notifications ────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'KAI 家計簿', {
      body: data.body ?? '通知があります',
      tag: data.tag ?? 'kai-notification',
      data: { url: data.url ?? '/login' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus()
        }
        return self.clients.openWindow(event.notification.data?.url ?? '/login')
      })
  )
})
