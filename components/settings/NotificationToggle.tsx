'use client'

import { useState, useEffect } from 'react'
import { BellIcon, BellOffIcon } from 'lucide-react'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

export function NotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true)
    setPermission(Notification.permission)
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    })
  }, [])

  async function handleEnable() {
    setLoading(true)
    setError(null)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('通知が許可されませんでした')
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        setError('サーバーの設定が未完了です（VAPID）')
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const json = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!res.ok) throw new Error('購読の保存に失敗しました')

      setSubscribed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知の設定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '解除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-[var(--kai-text4)]">このブラウザはプッシュ通知に対応していません</p>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-[var(--kai-text3)]">
        通知がブロックされています。ブラウザのサイト設定から許可してください。
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--kai-text1)]">月次レポート通知</p>
          <p className="mt-0.5 text-xs text-[var(--kai-text3)]">
            {subscribed
              ? '毎月1日に家計レポートの通知が届きます'
              : '月初の家計レポートをプッシュ通知で受け取ります'}
          </p>
        </div>
        <button
          onClick={subscribed ? handleDisable : handleEnable}
          disabled={loading}
          className={`flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
            subscribed
              ? 'border border-[#fb7185]/30 bg-[#fb7185]/10 text-[#fb7185] hover:bg-[#fb7185]/20'
              : 'border border-[#fb9477]/30 bg-[#fb9477]/10 text-[#fb9477] hover:bg-[#fb9477]/20'
          }`}
        >
          {subscribed
            ? <BellOffIcon className="size-3.5" />
            : <BellIcon className="size-3.5" />}
          {loading ? '処理中…' : subscribed ? '通知をオフ' : '通知をオン'}
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-[#fb7185]/20 bg-[#fb7185]/5 px-3 py-2 text-xs text-[#fb7185]">
          {error}
        </p>
      )}
    </div>
  )
}
