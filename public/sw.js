// ── PWA installability: install / activate / fetch ───────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// fetch ハンドラが必須（ないと Chrome が PWA と認識しない）
self.addEventListener('fetch', () => {})

// ── Push notifications ────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'KAI 家計簿', {
      body: data.body ?? '通知があります',
      tag: data.tag ?? 'kai-notification',
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus()
        }
        return clients.openWindow(event.notification.data?.url ?? '/')
      })
  )
})
