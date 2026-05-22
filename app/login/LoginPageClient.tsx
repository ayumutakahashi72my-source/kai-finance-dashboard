'use client'

import { createClient } from '@/lib/supabase/client'
import { LoginScreen } from '@/components/auth/LoginScreen'

export default function LoginPageClient() {
  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return <LoginScreen onGoogleSignIn={handleGoogleSignIn} />
}
