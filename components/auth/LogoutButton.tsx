'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { KAI } from '@/lib/kai-tokens'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: 'rgba(251,113,133,.08)', border: '1px solid rgba(251,113,133,.2)',
        color: KAI.danger, fontSize: 14, fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
