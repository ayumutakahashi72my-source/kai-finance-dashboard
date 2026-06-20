'use client'

import { useState } from 'react'
import { Palette } from 'lucide-react'

export function FixCategoryColorsButton() {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle')
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleFix() {
    setPhase('loading')
    setError(null)
    try {
      const res = await fetch('/api/settings/categories/fix-colors', { method: 'POST' })
      const data = await res.json() as { updated: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'エラー')
      setCount(data.updated)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '失敗しました')
      setPhase('idle')
    }
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'rgba(122,167,255,.11)', border: '1px solid rgba(122,167,255,.18)' }}
        >
          <Palette className="size-[18px]" style={{ color: '#7aa7ff' }} />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-medium" style={{ color: 'var(--kai-text1)' }}>
            カテゴリ色・アイコンを自動設定
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--kai-text4)' }}>
            色やアイコンが未設定のカテゴリにHaikuが絵文字を割り当てます
          </p>

          {error && <p className="mt-2 text-[12px]" style={{ color: '#f87171' }}>{error}</p>}

          {phase === 'done' ? (
            <p className="mt-3 text-[13px]" style={{ color: '#4ade80' }}>
              ✓ {count > 0 ? `${count} 件のカテゴリを更新しました` : 'すでに全て設定済みです'}
            </p>
          ) : (
            <button
              onClick={handleFix}
              disabled={phase === 'loading'}
              className="mt-3 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors hover:opacity-80 disabled:opacity-40"
              style={{ background: 'rgba(122,167,255,.15)', border: '1px solid rgba(122,167,255,.25)', color: '#7aa7ff' }}
            >
              {phase === 'loading' ? 'AI生成中...' : '色・アイコンを設定する'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
