'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          gcTime:    10 * 60 * 1000,
        },
      },
    })
  )

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    console.log('[PWA] controller at mount:', navigator.serviceWorker.controller)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        console.log('[PWA] SW registered, state:', reg.active?.state ?? 'no active worker')
      })
      .catch((err) => console.warn('[PWA] SW registration failed:', err))

    navigator.serviceWorker.ready.then((reg) => {
      console.log('[PWA] SW ready — scope:', reg.scope)
      console.log('[PWA] controller after ready:', navigator.serviceWorker.controller)
    })

    window.addEventListener('beforeinstallprompt', () => {
      console.log('[PWA] beforeinstallprompt fired')
    })

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] appinstalled fired')
    })
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
