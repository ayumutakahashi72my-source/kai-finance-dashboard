'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KAI } from '@/lib/kai-tokens'
import { Users, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface Props {
  token: string
  householdName: string
  isValid: boolean
}

export default function AcceptPanel({ token, householdName, isValid }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleAccept() {
    setState('loading')
    const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
    const json = await res.json().catch(() => ({}))
    if (res.ok) {
      setState('done')
      setTimeout(() => router.push('/'), 1500)
    } else {
      setErrorMsg(json.error ?? '参加に失敗しました')
      setState('error')
    }
  }

  const panel: React.CSSProperties = {
    background: 'rgba(20,22,32,0.75)',
    backdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '36px 32px',
    textAlign: 'center',
    maxWidth: 400,
    width: '100%',
  }

  if (!isValid) {
    return (
      <div style={panel}>
        <XCircle size={40} style={{ color: KAI.danger, margin: '0 auto 16px' }}/>
        <p style={{ fontSize: 16, fontWeight: 700, color: KAI.text1, marginBottom: 8 }}>招待リンクが無効です</p>
        <p style={{ fontSize: 13, color: KAI.text4 }}>有効期限切れか、すでに使用済みのリンクです。</p>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div style={panel}>
        <CheckCircle size={40} style={{ color: KAI.success, margin: '0 auto 16px' }}/>
        <p style={{ fontSize: 16, fontWeight: 700, color: KAI.text1, marginBottom: 8 }}>参加しました！</p>
        <p style={{ fontSize: 13, color: KAI.text4 }}>ダッシュボードに移動します…</p>
      </div>
    )
  }

  return (
    <div style={panel}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
        background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: KAI.violet,
      }}>
        <Users size={24} strokeWidth={2}/>
      </div>

      <p style={{ fontSize: 13, color: KAI.text4, marginBottom: 6 }}>招待されています</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: KAI.text1, marginBottom: 24 }}>
        {householdName}
      </p>

      {state === 'error' && (
        <div style={{
          background: `${KAI.danger}12`, border: `1px solid ${KAI.danger}30`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: KAI.danger,
        }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={state === 'loading'}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg, ${KAI.violet}, ${KAI.cyan})`,
          color: '#fff', fontSize: 14, fontWeight: 700, cursor: state === 'loading' ? 'not-allowed' : 'pointer',
          opacity: state === 'loading' ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {state === 'loading'
          ? <><Loader2 size={15} className="animate-spin"/> 参加中…</>
          : 'この家計簿に参加する'
        }
      </button>
    </div>
  )
}
