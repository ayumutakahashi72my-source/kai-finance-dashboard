'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

export function CleanupCardTransfersButton() {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'loading' | 'done'>('idle')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [deletedCount, setDeletedCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handlePreview() {
    setError(null)
    setPhase('loading')
    try {
      const res = await fetch('/api/transactions/cleanup-card-transfers')
      const data = await res.json() as { count: number }
      setPreviewCount(data.count)
      setPhase('confirm')
    } catch {
      setError('確認に失敗しました')
      setPhase('idle')
    }
  }

  async function handleDelete() {
    setPhase('loading')
    try {
      const res = await fetch('/api/transactions/cleanup-card-transfers', { method: 'DELETE' })
      const data = await res.json() as { deleted: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'エラー')
      setDeletedCount(data.deleted)
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました')
      setPhase('confirm')
    }
  }

  if (phase === 'done') {
    return (
      <div className="px-5 py-4">
        <p style={{ color: '#4ade80', fontSize: 14, fontWeight: 600 }}>
          ✓ {deletedCount} 件のカード引き落とし重複データを削除しました
        </p>
        <p style={{ color: 'var(--kai-text4)', fontSize: 12, marginTop: 4 }}>
          CSVを再インポートすると正しいデータが取り込まれます
        </p>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
          style={{ background: 'rgba(251,148,119,.11)', border: '1px solid rgba(251,148,119,.18)' }}
        >
          <Trash2 className="size-[18px]" style={{ color: '#fb9477' }} />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-medium" style={{ color: 'var(--kai-text1)' }}>
            カード引き落とし重複データを削除
          </p>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--kai-text4)' }}>
            振替フラグの読み取りバグにより、カード引き落とし行が二重計上されている場合に削除します
          </p>

          {error && (
            <p className="mt-2 text-[12px]" style={{ color: '#f87171' }}>{error}</p>
          )}

          {phase === 'idle' && (
            <button
              onClick={handlePreview}
              className="mt-3 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ background: 'rgba(251,148,119,.15)', border: '1px solid rgba(251,148,119,.25)', color: '#fb9477' }}
            >
              対象件数を確認する
            </button>
          )}

          {phase === 'loading' && (
            <p className="mt-3 text-[12px]" style={{ color: 'var(--kai-text4)' }}>確認中...</p>
          )}

          {phase === 'confirm' && (
            <div className="mt-3">
              {previewCount === 0 ? (
                <p className="text-[13px]" style={{ color: '#4ade80' }}>
                  ✓ 重複データは見つかりませんでした
                </p>
              ) : (
                <>
                  <div
                    className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(251,148,119,.08)', border: '1px solid rgba(251,148,119,.15)' }}
                  >
                    <AlertTriangle className="size-4 shrink-0" style={{ color: '#fb9477' }} />
                    <p className="text-[13px]" style={{ color: 'var(--kai-text1)' }}>
                      <strong>{previewCount} 件</strong>のカード引き落とし取引が見つかりました。削除しますか？
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors hover:opacity-80"
                      style={{ background: 'rgba(248,113,113,.18)', border: '1px solid rgba(248,113,113,.30)', color: '#f87171' }}
                    >
                      {previewCount} 件を削除する
                    </button>
                    <button
                      onClick={() => { setPhase('idle'); setPreviewCount(null) }}
                      className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors hover:opacity-80"
                      style={{ background: 'var(--kai-overlay-weak)', border: '1px solid var(--kai-border2)', color: 'var(--kai-text3)' }}
                    >
                      キャンセル
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
