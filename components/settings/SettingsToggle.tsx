'use client'

import { useState, useEffect } from 'react'
import { KAI } from '@/lib/kai-tokens'

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

function Toggle({ on, loading, onClick }: { on: boolean; loading?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-checked={on}
      role="switch"
      style={{
        width: 44, height: 25, borderRadius: 13, position: 'relative', flexShrink: 0,
        cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
        background: on ? KAI.success : KAI.overlayWeak,
        transition: 'background .2s', opacity: loading ? 0.5 : 1,
      }}
    >
      <div style={{
        position: 'absolute', top: 2.5, width: 20, height: 20, borderRadius: '50%',
        background: on ? KAI.bgCard : KAI.text4,
        left: on ? 21.5 : 2.5, transition: 'left .2s',
      }} />
    </button>
  )
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- capability check only runs once on mount */
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub))
    })
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function toggle() {
    setLoading(true)
    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } else {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) return
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
        const json = sub.toJSON()
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }) })
        setSubscribed(true)
      }
    } finally { setLoading(false) }
  }

  if (!supported) return <span style={{ fontSize: 10, color: KAI.text4 }}>非対応</span>
  return <Toggle on={subscribed} loading={loading} onClick={toggle} />
}

type NotificationFlags = {
  budget_alert_enabled: boolean
  receipt_auto_classify_enabled: boolean
}

/**
 * households.settings に保存される通知系フラグのトグル。
 * field で対象フラグを指定する（budget_alert_enabled / receipt_auto_classify_enabled）。
 * 以前は StaticToggle というローカルstateのみの見せかけトグルだったが、
 * 実際に households.settings を読み書きするよう差し替えた。
 */
export function HouseholdFlagToggle({ field }: { field: keyof NotificationFlags }) {
  const [on, setOn] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((data: NotificationFlags) => setOn(data[field] !== false))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [field])

  async function toggle() {
    const next = !on
    setOn(next) // 楽観的更新
    setLoading(true)
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: next }),
      })
      if (!res.ok) setOn(!next) // 失敗時は元に戻す
    } catch {
      setOn(!next)
    } finally {
      setLoading(false)
    }
  }

  return <Toggle on={on} loading={loading} onClick={toggle} />
}
