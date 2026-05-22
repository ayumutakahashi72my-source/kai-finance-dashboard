// Minimal PWA Service Worker — installability 要件を満たす最小構成

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// fetch handler が存在しないと Android Chrome は installable と判断しない
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
