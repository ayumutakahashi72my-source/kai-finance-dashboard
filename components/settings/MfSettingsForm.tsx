'use client'

import { useState } from 'react'
import { CheckCircleIcon, AlertCircleIcon, TrashIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  initialEmail: string | null
  initialEnabled: boolean
}

interface SyncResult {
  inserted: number
  skipped: number
  year: number
  month: number
}

export function MfSettingsForm({ initialEmail, initialEnabled }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setSyncResult(null)
    const res = await fetch('/api/settings/mf', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mf_email: email, mf_password: password }),
    })
    const data = await res.json() as { success?: boolean; error?: string }
    setLoading(false)
    if (data.success) {
      setEnabled(true)
      setPassword('')
      setMessage({ type: 'ok', text: 'MF設定を保存しました。毎日AM6時に自動取り込みが実行されます。' })
    } else {
      setMessage({ type: 'err', text: data.error ?? '保存に失敗しました' })
    }
  }

  async function handleDelete() {
    if (!confirm('MFの自動取り込み設定を削除しますか？')) return
    setLoading(true)
    setMessage(null)
    setSyncResult(null)
    const res = await fetch('/api/settings/mf', { method: 'DELETE' })
    const data = await res.json() as { success?: boolean; error?: string }
    setLoading(false)
    if (data.success) {
      setEnabled(false)
      setEmail('')
      setPassword('')
      setMessage({ type: 'ok', text: '設定を削除しました' })
    } else {
      setMessage({ type: 'err', text: data.error ?? '削除に失敗しました' })
    }
  }

  async function handleSync() {
    setSyncing(true)
    setMessage(null)
    setSyncResult(null)
    const res = await fetch('/api/settings/mf/sync', { method: 'POST' })
    const data = await res.json() as SyncResult & { error?: string }
    setSyncing(false)
    if (data.error) {
      setMessage({ type: 'err', text: data.error })
    } else {
      setSyncResult(data)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#f0f0f5]">マネーフォワードMe 自動取り込み</p>
          <p className="text-xs text-[#8b8ba0]">毎日 AM6時 に当月の取引を自動取込します</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            enabled ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-white/5 text-[#5e5e72]'
          }`}
        >
          {enabled ? '有効' : '無効'}
        </span>
      </div>

      <div className="rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/5 px-3 py-2">
        <p className="text-xs text-[#fbbf24]/90">
          ⚠ 非公式APIを使用します。MFの仕様変更により停止する場合があります。
          パスワードはDB（households.settings）に平文保存されます。
          専用のMFサブアカウント使用を推奨します。
        </p>
      </div>

      {/* 手動取り込みパネル（設定済みの場合のみ表示） */}
      {enabled && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#f0f0f5]">今すぐ取り込む</p>
              <p className="text-xs text-[#8b8ba0]">当月の取引を手動で取り込みます</p>
            </div>
            <Button
              type="button"
              onClick={handleSync}
              disabled={syncing || loading}
              className="shrink-0 gap-1.5 bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee]/20 border border-[#22d3ee]/20 disabled:opacity-40"
            >
              <RefreshCwIcon className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '取り込み中…' : '今すぐ取り込む'}
            </Button>
          </div>

          {syncResult && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#4ade80]/20 bg-[#4ade80]/5 px-3 py-2">
              <CheckCircleIcon className="size-3.5 shrink-0 text-[#4ade80]" />
              <p className="text-xs text-[#4ade80]">
                {syncResult.year}年{syncResult.month}月 — 新規追加{' '}
                <span className="font-semibold">{syncResult.inserted}件</span>
                、スキップ {syncResult.skipped}件
              </p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="mf-email" className="text-[#8b8ba0] text-xs">
            MFメールアドレス
          </Label>
          <Input
            id="mf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
            className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="mf-password" className="text-[#8b8ba0] text-xs">
            MFパスワード
            {enabled && <span className="ml-1 text-[#5e5e72]">（変更する場合のみ入力）</span>}
          </Label>
          <Input
            id="mf-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={enabled ? '••••••••' : 'パスワード'}
            required={!enabled}
            className="bg-[#0a0a10] border-white/10 text-[#f0f0f5] placeholder:text-[#5e5e72] focus-visible:border-[#5eead4]/50 focus-visible:ring-[#5eead4]/20"
          />
        </div>

        {message && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
              message.type === 'ok'
                ? 'border-[#4ade80]/20 bg-[#4ade80]/5 text-[#4ade80]'
                : 'border-[#fb7185]/20 bg-[#fb7185]/5 text-[#fb7185]'
            }`}
          >
            {message.type === 'ok' ? (
              <CheckCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            ) : (
              <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={loading || syncing}
            className="flex-1 bg-[#5eead4] text-[#0a0a10] font-semibold hover:bg-[#5eead4]/90 disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存する'}
          </Button>
          {enabled && (
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading || syncing}
              className="gap-1.5 border border-[#fb7185]/20 bg-[#fb7185]/5 text-[#fb7185] hover:bg-[#fb7185]/10"
            >
              <TrashIcon className="size-3.5" />
              削除
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
