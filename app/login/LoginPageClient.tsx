'use client'

import { createClient } from '@/lib/supabase/client'
import { LoginScreen } from '@/components/auth/LoginScreen'

const LEGAL_URLS = {
  tos:     '/legal/terms-of-service.pdf',
  privacy: '/legal/privacy-policy.pdf',
  cookie:  '/legal/cookie-policy.pdf',
  data:    '/legal/data-handling-policy.pdf',
} as const

export default function LoginPageClient() {
  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  function handleTermsClick(kind: 'tos' | 'privacy' | 'cookie' | 'data') {
    window.open(LEGAL_URLS[kind], '_blank', 'noopener,noreferrer')
  }

  return <LoginScreen onGoogleSignIn={handleGoogleSignIn} onTermsClick={handleTermsClick} />
}
