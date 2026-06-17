'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoginScreen } from '@/components/auth/LoginScreen'

const LEGAL_ROUTES = {
  tos:     '/legal/terms',
  privacy: '/legal/privacy',
  cookie:  '/legal/cookie',
  data:    '/legal/data',
} as const

const isDemoEnabled = !!process.env.NEXT_PUBLIC_DEMO_ENABLED

export default function LoginPageClient() {
  const router = useRouter()

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleDemoSignIn() {
    const res = await fetch('/api/auth/demo', { method: 'POST' })
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'ログイン失敗' }))
      alert(error)
      return
    }
    window.location.href = '/'
  }

  function handleTermsClick(kind: 'tos' | 'privacy' | 'cookie' | 'data') {
    router.push(LEGAL_ROUTES[kind])
  }

  return (
    <LoginScreen
      onGoogleSignIn={handleGoogleSignIn}
      onDemoSignIn={isDemoEnabled ? handleDemoSignIn : undefined}
      onTermsClick={handleTermsClick}
    />
  )
}
