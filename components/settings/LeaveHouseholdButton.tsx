'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, AlertTriangle } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'

interface Props {
  isOwner: boolean
}

export function LeaveHouseholdButton({ isOwner }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLeave() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/settings/household/leave', { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(json.error ?? '退会に失敗しました')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${KAI.danger}12`, border: `1px solid ${KAI.danger}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.danger,
        }}>
          <LogOut size={16} strokeWidth={2}/>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: KAI.danger }}>
            {isOwner ? '世帯を削除する' : 'この世帯から脱退する'}
          </p>
          <p style={{ fontSize: 12, color: KAI.text4, marginTop: 1 }}>
            {isOwner
              ? '取引・カテゴリ・AI履歴がすべて削除されます'
              : 'この世帯のデータにアクセスできなくなります'}
          </p>
        </div>
      </button>

      {/* 確認ダイアログ */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setOpen(false) }}
        >
          <div style={{
            background: '#13111e', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 20, padding: '28px 24px', maxWidth: 380, width: '100%',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
              background: `${KAI.danger}14`, border: `1px solid ${KAI.danger}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.danger,
            }}>
              <AlertTriangle size={22} strokeWidth={2}/>
            </div>

            <p style={{ fontSize: 16, fontWeight: 800, color: KAI.text1, textAlign: 'center', marginBottom: 8 }}>
              {isOwner ? '世帯を削除しますか？' : 'この世帯から脱退しますか？'}
            </p>
            <p style={{ fontSize: 13, color: KAI.text4, textAlign: 'center', lineHeight: 1.7, marginBottom: 20 }}>
              {isOwner
                ? 'すべての取引・カテゴリ・AI履歴が完全に削除されます。この操作は取り消せません。'
                : 'この世帯のデータにアクセスできなくなります。'}
            </p>

            {error && (
              <div style={{
                background: `${KAI.danger}10`, border: `1px solid ${KAI.danger}28`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                fontSize: 12, color: KAI.danger, lineHeight: 1.6,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { if (!loading) setOpen(false) }}
                disabled={loading}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 11,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: KAI.text3, fontSize: 13, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleLeave}
                disabled={loading}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 11, border: 'none',
                  background: KAI.danger,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin"/>{isOwner ? '削除中…' : '脱退中…'}</>
                  : (isOwner ? '削除する' : '脱退する')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
