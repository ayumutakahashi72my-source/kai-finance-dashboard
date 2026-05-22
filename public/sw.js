// ── PWA installability: install / activate / fetch ───────────────
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Chrome が PWA と認識するための fetch ハンドラ (network-first)
self.addEventListener('fetch', (event) => {
  // GET 以外・chrome-extension はスキップ
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith('http')) return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})

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
