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

export default function LoginPageClient() {
  const router = useRouter()

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  function handleTermsClick(kind: 'tos' | 'privacy' | 'cookie' | 'data') {
    router.push(LEGAL_ROUTES[kind])
  }

  return <LoginScreen onGoogleSignIn={handleGoogleSignIn} onTermsClick={handleTermsClick} />
}
