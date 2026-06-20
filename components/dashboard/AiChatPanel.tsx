'use client'

import { useEffect, useRef, useState } from 'react'
import { SendIcon } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UsageInfo {
  session_count: number
  estimated_cost: number
}

/* suggestion chips shown when chat is empty (alwaysOpen mode) */
const SUGGESTIONS = [
  '今月の支出傾向を教えて',
  '節約できそうな項目は？',
  '食費の使いすぎを判定して',
  '来月の予算アドバイスをして',
]

interface Props {
  alwaysOpen?: boolean
}

export function AiChatPanel({ alwaysOpen = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usage, setUsage] = useState<UsageInfo>({ session_count: 0, estimated_cost: 0 })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(alwaysOpen)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    fetch('/api/ai/chat', { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) return
        const json = await r.json()
        setMessages(json.messages ?? [])
        setUsage(json.usage ?? { session_count: 0, estimated_cost: 0 })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || sending) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setSending(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error === 'limit_exceeded' ? '今月の利用上限に達しました（20回 / ¥2,000）' : (json.error ?? '送信失敗'))
        setMessages((prev) => prev.slice(0, -1))
        return
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: json.message }])
      setUsage(json.usage)
    } catch {
      setError('通信エラーが発生しました')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  const limitReached = usage.session_count >= 20 || usage.estimated_cost >= 2000

  /* ── alwaysOpen: Direction C full chat layout ── */
  if (alwaysOpen) {
    return (
      <div
        className="kai-rise rounded-[18px] flex flex-col"
        style={{
          background: KAI.bgPanel,
          backdropFilter: 'blur(24px) saturate(160%)',
          border: `1px solid ${KAI.border2}`,
          minHeight: 420,
        }}
      >
        {/* header */}
        <div
          style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${KAI.overlayBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="6" r="3" fill="var(--kai-text1)" />
                <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--kai-text1)" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: KAI.text1, lineHeight: 1 }}>AIチャット</p>
              <p style={{ fontSize: 10, color: KAI.text3, marginTop: 2, fontFamily: 'var(--font-mono),monospace' }}>
                {usage.session_count}/20回 · ¥{usage.estimated_cost}
              </p>
            </div>
          </div>
          <span style={{ fontSize: 9, fontFamily: 'var(--font-mono),monospace', fontWeight: 700, letterSpacing: '.10em', padding: '2px 6px', borderRadius: 99, background: 'rgba(167,139,250,.12)', border: '1px solid rgba(167,139,250,.28)', color: KAI.violet, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: KAI.violet, boxShadow: `0 0 6px ${KAI.violet}`, display: 'inline-block', animation: 'kai-blink 1.8s ease-in-out infinite' }} />
            Sonnet
          </span>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 420 }}>
          {messages.length === 0 && (
            <div>
              <p style={{ fontSize: 13, color: KAI.text3, textAlign: 'center', paddingTop: 8, paddingBottom: 16 }}>
                家計について何でも聞いてください
              </p>
              {/* suggestion chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={limitReached || sending}
                    style={{
                      fontSize: 12, color: KAI.coral, padding: '6px 12px', borderRadius: 99,
                      background: 'rgba(251,148,119,.10)', border: '1px solid rgba(251,148,119,.22)',
                      cursor: 'pointer', transition: 'background 0.14s',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.role === 'assistant' && (
                <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="6" r="3" fill="var(--kai-text1)" />
                    <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--kai-text1)" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              <div
                style={{
                  maxWidth: '78%', borderRadius: 16, padding: '10px 14px', fontSize: 14, lineHeight: 1.65,
                  background: m.role === 'user' ? 'rgba(251,148,119,0.15)' : KAI.overlayWeak,
                  color: m.role === 'user' ? KAI.text1 : KAI.text2,
                  border: m.role === 'user' ? '1px solid rgba(251,148,119,0.22)' : `1px solid ${KAI.overlayBorder}`,
                  borderBottomRightRadius: m.role === 'user' ? 4 : 16,
                  borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16,
                }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="6" r="3" fill="var(--kai-text1)" />
                  <path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--kai-text1)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ borderRadius: 16, borderBottomLeftRadius: 4, padding: '10px 14px', background: KAI.overlayWeak, border: `1px solid ${KAI.overlayBorder}`, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                {[0, 150, 300].map((d) => (
                  <span key={d} style={{ width: 6, height: 6, borderRadius: '50%', background: KAI.text3, display: 'inline-block', animation: `kai-stream-dot 1.2s ${d}ms ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <p style={{ padding: '0 20px 8px', fontSize: 12, color: KAI.danger }}>{error}</p>}

        {/* input */}
        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${KAI.overlayBorder}`, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={limitReached ? '今月の利用上限に達しました' : '家計について質問…'}
            disabled={sending || limitReached}
            className="kai-input"
            style={{
              flex: 1, borderRadius: 99, padding: '10px 16px', fontSize: 14,
            }}
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim() || limitReached}
            aria-label="送信"
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg,${KAI.coral},${KAI.violet})`,
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: KAI.bg, cursor: 'pointer', opacity: (!input.trim() || sending || limitReached) ? 0.4 : 1,
              transition: 'opacity .15s',
            }}
          >
            <SendIcon size={16} />
          </button>
        </div>
      </div>
    )
  }

  /* ── collapsible mode (used in DashboardTabs strategy tab) ── */
  return (
    <div
      className="rounded-[18px]"
      style={{
        background: KAI.bgPanel,
        backdropFilter: 'blur(24px) saturate(160%)',
        border: `1px solid ${KAI.border2}`,
      }}
    >
      <button
        className="flex w-full items-center justify-between p-5"
        onClick={() => setOpen((v) => !v)}
      >
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: KAI.text2 }}>
          <span
            style={{ width: 20, height: 20, borderRadius: 5, background: `linear-gradient(135deg,${KAI.coral},#f5d4b8)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: KAI.bg }}
          >
            AI
          </span>
          AIチャット
        </p>
        <span style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 12, color: KAI.text3 }}>
          {usage.session_count}/20回 · ¥{usage.estimated_cost}
        </span>
      </button>

      {open && (
        <>
          <div className="max-h-72 space-y-3 overflow-y-auto px-5 pb-3">
            {messages.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: KAI.text3 }}>家計について何でも聞いてください</p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%', borderRadius: 16, padding: '8px 14px', fontSize: 14, lineHeight: 1.6,
                    background: m.role === 'user' ? 'rgba(251,148,119,0.15)' : KAI.overlayWeak,
                    color: m.role === 'user' ? KAI.text1 : KAI.text2,
                    border: m.role === 'user' ? '1px solid rgba(251,148,119,0.20)' : `1px solid ${KAI.overlayBorder}`,
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ borderRadius: 16, padding: '8px 14px', background: KAI.overlayWeak, border: `1px solid ${KAI.overlayBorder}`, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ animationDelay: `${d}ms`, background: KAI.text3 }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p style={{ padding: '0 20px 8px', fontSize: 12, color: KAI.danger }}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: `1px solid ${KAI.overlayBorder}` }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={limitReached ? '今月の利用上限に達しました' : '質問を入力…'}
              disabled={sending || limitReached}
              style={{ flex: 1, borderRadius: 12, padding: '8px 14px', fontSize: 14, background: KAI.overlayWeak, border: `1px solid ${KAI.overlayBorder}`, color: KAI.text1, outline: 'none' }}
            />
            <button
              onClick={() => send()}
              disabled={sending || !input.trim() || limitReached}
              aria-label="送信"
              style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.coral, cursor: 'pointer' }}
            >
              <SendIcon size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
