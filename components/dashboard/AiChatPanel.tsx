'use client'

import { useEffect, useRef, useState } from 'react'
import { BotIcon, SendIcon } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UsageInfo {
  session_count: number
  estimated_cost: number
}

export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [usage, setUsage] = useState<UsageInfo>({ session_count: 0, estimated_cost: 0 })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/ai/chat')
      .then((r) => r.json())
      .then((json) => {
        setMessages(json.messages ?? [])
        setUsage(json.usage ?? { session_count: 0, estimated_cost: 0 })
      })
      .catch(() => {})
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setError(null)
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
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

  return (
    <div
      className="rounded-[18px]"
      style={{
        background: 'rgba(20,22,32,0.66)',
        backdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* ヘッダー（折りたたみ） */}
      <button
        className="flex w-full items-center justify-between p-5"
        onClick={() => setOpen((v) => !v)}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-[#c4c4d0]">
          <span
            className="flex h-5 w-5 items-center justify-center rounded-[5px] text-[9px] font-black text-[#0a0a10]"
            style={{ background: 'linear-gradient(135deg,#5eead4,#22d3ee)' }}
          >
            AI
          </span>
          AIチャット
        </p>
        <span className="mono text-xs text-[#5e5e72]">
          {usage.session_count}/20回 · ¥{usage.estimated_cost}
        </span>
      </button>

      {open && (
        <>
          {/* メッセージリスト */}
          <div className="max-h-72 space-y-3 overflow-y-auto px-5 pb-3">
            {messages.length === 0 && (
              <p className="py-4 text-center text-sm text-[#5e5e72]">
                家計について何でも聞いてください
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
                  style={{
                    background: m.role === 'user' ? 'rgba(94,234,212,0.15)' : 'rgba(255,255,255,0.04)',
                    color: m.role === 'user' ? '#f0f0f5' : '#c4c4d0',
                    border: m.role === 'user' ? '1px solid rgba(94,234,212,0.20)' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3.5 py-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b8ba0]" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b8ba0]" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8b8ba0]" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-5 pb-2 text-xs text-[#fb7185]">{error}</p>}

          {/* 入力エリア */}
          <div
            className="flex items-center gap-2 p-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder={limitReached ? '今月の利用上限に達しました' : '質問を入力…'}
              disabled={sending || limitReached}
              className="flex-1 rounded-xl px-3.5 py-2 text-sm text-[#f0f0f5] outline-none disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim() || limitReached}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#5eead4] transition-colors hover:bg-[#5eead4]/30 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'rgba(94,234,212,0.12)', border: '1px solid rgba(94,234,212,0.20)' }}
              aria-label="送信"
            >
              <SendIcon className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
