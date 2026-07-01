'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { KAI } from '@/lib/kai-tokens'

const OPTIONS = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
] as const

export function ThemeSegmented() {
  // OS追従の "system" はサイドバーの ThemeToggle（ライト/ダークの2値トグル）が
  // 認識できず、system状態で押すと問答無用で片方に固定されてしまうため廃止。
  // resolvedTheme（system込みで実際に適用中の値）で選択状態を判定し、
  // 既に system で保存済みのユーザーもどちらかを押した瞬間に明示的な値へ移行する。
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ height: 35 }} />

  return (
    <div style={{
      display: 'flex', background: KAI.overlayWeak,
      border: `1px solid ${KAI.border}`, borderRadius: 11, padding: 3, gap: 3,
    }}>
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          style={{
            flex: 1, border: 'none', borderRadius: 8, padding: '7px 4px',
            fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            background: resolvedTheme === o.value ? KAI.border2 : 'transparent',
            color: resolvedTheme === o.value ? KAI.text1 : KAI.text3,
            boxShadow: resolvedTheme === o.value ? '0 1px 2px rgba(0,0,0,.3)' : 'none',
            transition: 'all .15s',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
