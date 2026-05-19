'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Icon, MONO_STYLE } from '@/components/kai/shared'

interface Props {
  initialEmail:   string | null
  initialEnabled: boolean
}

type Msg = { type: 'ok' | 'err'; text: string }

export function MfSettingsForm({ initialEmail, initialEnabled }: Props) {
  const [email,    setEmail]    = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [enabled,   setEnabled]   = useState(initialEnabled)
  const [loading,   setLoading]   = useState(false)
  const [message,   setMessage]   = useState<Msg | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)
    const res = await fetch('/api/settings/mf', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mf_email: email, mf_password: password }),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    setLoading(false)
    if (data.success) {
      setEnabled(true); setPassword('')
      setMessage({ type: 'ok', text: '連携設定を保存しました。毎朝 6:00 に自動取込が実行されます。' })
    } else {
      setMessage({ type: 'err', text: data.error ?? '保存に失敗しました' })
    }
  }

  async function handleDelete() {
    if (!confirm('MF 自動連携設定を削除しますか？')) return
    setLoading(true); setMessage(null)
    const res = await fetch('/api/settings/mf', { method: 'DELETE' })
    const data = await res.json() as { success?: boolean; error?: string }
    setLoading(false)
    if (data.success) {
      setEnabled(false); setEmail(''); setPassword('')
      setMessage({ type: 'ok', text: '設定を削除しました' })
    } else {
      setMessage({ type: 'err', text: data.error ?? '削除に失敗しました' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Status chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 99,
            ...(enabled
              ? { background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.28)', color: KAI.success }
              : { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: KAI.text3 }
            ),
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: enabled ? KAI.success : KAI.text4, boxShadow: enabled ? '0 0 6px rgba(74,222,128,.7)' : 'none' }}/>
          {enabled ? '連携済み' : '未連携'}
        </span>
        {enabled && (
          <span style={{ fontSize: 11, color: KAI.text3 }}>毎朝 6:00 に自動取込</span>
        )}
      </div>

      {/* Credential form */}
      <form
        id="mf-form"
        onSubmit={handleSave}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', ...MONO_STYLE }}>
          MF ME ログイン情報
        </div>

        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ fontSize: 11, color: KAI.text3, fontWeight: 600, marginBottom: 7 }}>メールアドレス</div>
            <input
              type="email"
              className="kai-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: KAI.text3, fontWeight: 600, marginBottom: 7 }}>
              パスワード
              {enabled && <span style={{ color: KAI.text5, fontWeight: 400, marginLeft: 6 }}>（変更する場合のみ）</span>}
            </div>
            <input
              type="password"
              className="kai-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required={!enabled}
              autoComplete="current-password"
            />
          </div>
        </div>

        {message && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: message.type === 'ok' ? 'rgba(74,222,128,.06)' : 'rgba(251,113,133,.06)', border: `1px solid ${message.type === 'ok' ? 'rgba(74,222,128,.22)' : 'rgba(251,113,133,.22)'}`, borderRadius: 12, padding: '10px 12px', fontSize: 12, color: message.type === 'ok' ? KAI.success : KAI.danger, lineHeight: 1.55 }}>
            <span style={{ flexShrink: 0 }}>{message.type === 'ok' ? '✓' : '⚠'}</span>
            {message.text}
          </div>
        )}
      </form>

      {/* Buttons */}
      <section style={{ display: 'flex', gap: 10 }}>
        <Link href="/settings" className="kai-btn kai-btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
          戻る
        </Link>
        <button type="submit" form="mf-form" disabled={loading} className="kai-btn kai-btn-primary" style={{ flex: 2 }}>
          <Icon name="link" size={15} stroke={2.2}/>
          {loading ? '保存中…' : enabled ? '更新する' : '登録'}
        </button>
        {enabled && (
          <button type="button" onClick={handleDelete} disabled={loading} className="kai-btn kai-btn-danger">
            削除
          </button>
        )}
      </section>

      <div style={{ paddingBottom: 28 }} />
    </div>
  )
}
