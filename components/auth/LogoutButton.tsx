'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
      className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-[#c4c4d0] transition-colors hover:border-white/20 hover:bg-white/5 disabled:opacity-50"
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
