'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        width: '100%', padding: 14,
        background: 'rgba(251,113,133,0.08)',
        border: '1px solid rgba(251,113,133,0.2)',
        borderRadius: 14,
        color: '#fb7185',
        fontSize: 14, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >ログアウト</button>
  )
}
