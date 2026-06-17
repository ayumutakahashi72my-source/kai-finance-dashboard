'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useIsDemo(): boolean {
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL
    if (!demoEmail) return

    createClient()
      .auth.getUser()
      .then(({ data }) => setIsDemo(data.user?.email === demoEmail))
  }, [])

  return isDemo
}
