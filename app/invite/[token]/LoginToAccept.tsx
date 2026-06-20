'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { KAI } from '@/lib/kai-tokens'
import { LogIn } from 'lucide-react'

interface Props {
  token: string
}

export default function LoginToAccept({ token }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    // クッキーにトークンを保存（?next=パラメータがSupabaseに無視されるケースの対策）
    document.cookie = `kai_pending_invite=${token}; path=/; max-age=3600; samesite=lax`
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div style={{
      background: KAI.overlayBg,
      backdropFilter: 'blur(24px) saturate(160%)',
      border: `1px solid ${KAI.border}`,
      borderRadius: 20,
      padding: '36px 32px',
      textAlign: 'center',
      maxWidth: 400,
      width: '100%',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
        background: `${KAI.coral}18`, border: `1px solid ${KAI.coral}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: KAI.coral,
      }}>
        <LogIn size={24} strokeWidth={2}/>
      </div>

      <p style={{ fontSize: 20, fontWeight: 800, color: KAI.text1, marginBottom: 8 }}>KAI 家計簿</p>
      <p style={{ fontSize: 13, color: KAI.text3, marginBottom: 28, lineHeight: 1.7 }}>
        家計簿への招待が届いています。<br/>
        Googleアカウントでログインして参加してください。
      </p>

      <button
        onClick={handleSignIn}
        disabled={loading}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 12,
          border: `1px solid ${KAI.borderStrong}`,
          background: KAI.overlayWeak,
          color: KAI.text1, fontSize: 14, fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {loading ? (
          <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${KAI.coral}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }}/>
        ) : (
          <GoogleIcon />
        )}
        {loading ? '認証中…' : 'Googleでログインして参加'}
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}
