'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'
import { Icon, MONO_STYLE } from '@/components/kai/shared'

interface Props {
  initialEmail:   string | null
  initialEnabled: boolean
}

type Msg = { type: 'ok' | 'err'; text: string }

interface SyncLog {
  id: string
  triggered_by: 'manual' | 'cron'
  status: 'success' | 'error'
  step?: string
  inserted?: number
  skipped?: number
  year?: number
  month?: number
  error_msg?: string
  created_at: string
}

export function MfSettingsForm({ initialEmail, initialEnabled }: Props) {
  const [email,    setEmail]    = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [enabled,  setEnabled]  = useState(initialEnabled)
  const [loading,  setLoading]  = useState(false)
  const [syncing,  setSyncing]  = useState(false)
  const [message,  setMessage]  = useState<Msg | null>(null)
  const [syncMsg,  setSyncMsg]  = useState<Msg | null>(null)
  const [logs,     setLogs]     = useState<SyncLog[]>([])
  const [logsOpen, setLogsOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return
    fetch('/api/settings/mf/logs')
      .then((r) => r.json())
      .then((d: { logs?: SyncLog[] }) => setLogs(d.logs ?? []))
      .catch(() => {})
  }, [enabled])

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

  async function handleSync() {
    setSyncing(true); setSyncMsg(null)
    const now = new Date()
    try {
      const res = await fetch('/api/settings/mf/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      })
      const data = await res.json() as {
        inserted?: number; skipped?: number; error?: string; trace?: { step: string; url: string; status: number; note: string }[]
      }
      if (res.ok) {
        setSyncMsg({ type: 'ok', text: `同期完了: ${data.inserted ?? 0}件取込 / ${data.skipped ?? 0}件スキップ` })
      } else {
        const traceInfo = data.trace?.slice(-3).map((t) => `[${t.step}] ${t.note}`).join('\n') ?? ''
        setSyncMsg({ type: 'err', text: `${data.error ?? '同期失敗'}\n${traceInfo}` })
      }
    } catch (err) {
      setSyncMsg({ type: 'err', text: `ネットワークエラー: ${err instanceof Error ? err.message : '不明'}` })
    } finally {
      setSyncing(false)
      // refresh logs
      fetch('/api/settings/mf/logs')
        .then((r) => r.json())
        .then((d: { logs?: SyncLog[] }) => setLogs(d.logs ?? []))
        .catch(() => {})
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
          {loading ? '保存中…' : enabled ? '更新する' : '連携する'}
        </button>
        {enabled && (
          <button type="button" onClick={handleDelete} disabled={loading} className="kai-btn kai-btn-danger">
            削除
          </button>
        )}
      </section>

      {/* Manual sync */}
      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', ...MONO_STYLE, paddingTop: 4 }}>
            手動同期
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="kai-btn"
            style={{ background: 'rgba(251,148,119,.10)', border: '1px solid rgba(251,148,119,.25)', color: KAI.coral, fontWeight: 700 }}
          >
            <Icon name="plus" size={15} stroke={2.2}/>
            {syncing ? '同期中…' : '今すぐ同期テスト'}
          </button>

          {syncMsg && (
            <div style={{
              background: syncMsg.type === 'ok' ? 'rgba(74,222,128,.06)' : 'rgba(251,113,133,.06)',
              border: `1px solid ${syncMsg.type === 'ok' ? 'rgba(74,222,128,.22)' : 'rgba(251,113,133,.22)'}`,
              borderRadius: 12, padding: '10px 12px', fontSize: 12,
              color: syncMsg.type === 'ok' ? KAI.success : KAI.danger,
              lineHeight: 1.65, whiteSpace: 'pre-wrap',
            }}>
              <span style={{ flexShrink: 0 }}>{syncMsg.type === 'ok' ? '✓ ' : '⚠ '}</span>
              {syncMsg.text}
            </div>
          )}
        </div>
      )}

      {/* Sync logs */}
      {enabled && logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={() => setLogsOpen(!logsOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            <span style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', ...MONO_STYLE }}>
              同期ログ
            </span>
            <span style={{ fontSize: 10, color: KAI.text4 }}>{logsOpen ? '▲' : '▼'}</span>
          </button>

          {logsOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {logs.slice(0, 10).map((log) => {
                const d = new Date(log.created_at)
                const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
                return (
                  <div
                    key={log.id}
                    style={{
                      background: log.status === 'success' ? 'rgba(74,222,128,.04)' : 'rgba(251,113,133,.04)',
                      border: `1px solid ${log.status === 'success' ? 'rgba(74,222,128,.12)' : 'rgba(251,113,133,.14)'}`,
                      borderRadius: 10, padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: log.status === 'success' ? KAI.success : KAI.danger }}>
                        {log.status === 'success' ? '✓ 成功' : '✗ エラー'}
                      </span>
                      <span style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE }}>{label} · {log.triggered_by}</span>
                    </div>
                    {log.status === 'success' && (
                      <span style={{ fontSize: 11, color: KAI.text3 }}>{log.inserted ?? 0}件取込 / {log.skipped ?? 0}件スキップ</span>
                    )}
                    {log.error_msg && (
                      <span style={{ fontSize: 11, color: KAI.danger, display: 'block', wordBreak: 'break-all' }}>{log.error_msg}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ paddingBottom: 28 }} />
    </div>
  )
}
