'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getCategories } from '@/app/actions/categories'
import { createTransaction } from '@/app/actions/transactions'
import type { Category } from '@/lib/types'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import {
  CORAL, VIOLET, GREEN, RED, AMBER,
  TEXT1, TEXT3, TEXT4,
  today, OcrPrefill,
} from './_shared'

const BORDER = 'rgba(255,255,255,.08)'

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','00','0','del']
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
    }}>
      {keys.map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onKey(k)}
          style={{
            height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: k === 'del' ? 'rgba(251,113,133,.10)' : 'rgba(255,255,255,.05)',
            color: k === 'del' ? RED : TEXT1,
            fontSize: k === 'del' ? 0 : 20, fontWeight: 600,
            fontFamily: 'var(--font-mono), monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform .08s',
          }}
          onPointerDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(.96)' }}
          onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
          onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = '' }}
        >
          {k === 'del' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          ) : k}
        </button>
      ))}
    </div>
  )
}

export function ManualEntryTab({ onBack, onDone, prefill }: {
  onBack: () => void; onDone: () => void; prefill?: OcrPrefill
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isIncome, setIsIncome] = useState(false)
  const [amount, setAmount]     = useState('')
  const [categoryId, setCatId]  = useState('')
  const [aiSuggestId, setAiSuggestId]   = useState<string | null>(null)
  const [classifying, setClassifying]   = useState(false)
  const [userOverrode, setUserOverrode] = useState(false)
  const [memo, setMemo]         = useState('')
  const [occurredOn, setDate]   = useState(today())
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    getCategories().then((cats) => setCategories(cats as Category[]))
  }, [])

  useEffect(() => {
    if (!prefill) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill.payee) setMemo(prefill.payee)
    if (prefill.amount) setAmount(String(Math.abs(prefill.amount)))
    if (prefill.occurred_on) setDate(prefill.occurred_on)
  }, [prefill])

  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current)
    const trimmed = memo.trim()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (trimmed.length < 2) { setAiSuggestId(null); return }
    classifyTimerRef.current = setTimeout(async () => {
      setClassifying(true)
      try {
        const res = await fetch('/api/transactions/classify-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payee: trimmed }),
        })
        const data = await res.json() as { category_id: string | null }
        if (data.category_id) {
          setAiSuggestId(data.category_id)
          if (!userOverrode) setCatId(data.category_id)
        }
      } catch { /* ignore */ } finally {
        setClassifying(false)
      }
    }, 700)
  }, [memo, userOverrode])

  const handleKey = useCallback((k: string) => {
    setAmount(prev => {
      if (k === 'del') return prev.slice(0, -1)
      if (k === '00') return prev.length > 0 ? prev + '00' : prev
      if (k === '0' && prev === '') return prev
      if (prev.length >= 10) return prev
      return prev + k
    })
  }, [])

  const amountNumber    = parseInt(amount, 10) || 0
  const amountFormatted = amountNumber > 0 ? amountNumber.toLocaleString('ja-JP') : '0'

  const selectedCat = categories.find(c => c.id === categoryId)

  function handleCatClick(id: string) { setCatId(id); setUserOverrode(true) }

  async function handleSave() {
    if (!memo.trim() || amountNumber <= 0 || !occurredOn) return
    setSaving(true); setError('')
    const finalAmount = isIncome ? Math.abs(amountNumber) : -Math.abs(amountNumber)
    const fd = new FormData()
    fd.set('amount', String(finalAmount))
    fd.set('payee', memo.trim())
    fd.set('occurred_on', occurredOn)
    if (categoryId) fd.set('category_id', categoryId)
    const result = await createTransaction({}, fd)
    setSaving(false)
    if (result.success || (!result.errors && !result.message)) {
      setDone(true)
    } else {
      setError(result.message ?? Object.values(result.errors ?? {}).flat().join(' / '))
    }
  }

  if (done) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${GREEN}1a`, border: `1px solid ${GREEN}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>登録しました</p>
        <p style={{ fontSize: 12, color: TEXT3, marginTop: 4 }}>取引が追加されました</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button onClick={() => { setDone(false); setAmount(''); setMemo(''); setDate(today()); setCatId(''); setAiSuggestId(null); setUserOverrode(false) }} className="kai-btn kai-btn-secondary" style={{ flex: 1 }}>続けて追加</button>
          <button onClick={onDone} className="kai-btn kai-btn-primary" style={{ flex: 1 }}>完了</button>
        </div>
      </div>
    )
  }

  const dateLabel = (() => {
    const [,m,d] = occurredOn.split('-')
    return `${parseInt(m)}/${parseInt(d)}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0 10px' }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>手入力</span>
        <button type="button" onClick={onBack} style={{
          width: 30, height: 30, borderRadius: 9,
          background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* OCR confidence warnings */}
      {prefill && prefill.confidence !== undefined && prefill.confidence < 0.50 && (
        <div style={{ padding: '8px 12px', background: `${RED}0d`, border: `1px solid ${RED}33`, borderRadius: 10, fontSize: 11, color: RED, marginBottom: 8 }}>
          ⚠ 読み取れませんでした。手動で入力してください。
        </div>
      )}
      {prefill && prefill.confidence !== undefined && prefill.confidence >= 0.50 && prefill.confidence < 0.80 && (
        <div style={{ padding: '8px 12px', background: `${AMBER}0d`, border: `1px solid ${AMBER}33`, borderRadius: 10, fontSize: 11, color: AMBER, marginBottom: 8 }}>
          ⚠ 一部の項目のみ読み取れました。内容を確認してください。
        </div>
      )}

      {/* 支出/収入 toggle */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,.04)', borderRadius: 11, padding: 3, marginBottom: 8 }}>
        {([false, true] as const).map(inc => {
          const active = isIncome === inc
          const color = inc ? GREEN : RED
          return (
            <button key={String(inc)} type="button" onClick={() => setIsIncome(inc)} style={{
              flex: 1, padding: 7, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: active ? `${color}1c` : 'none',
              border: active ? `1px solid ${color}4d` : '1px solid transparent',
              color: active ? color : TEXT3,
            }}>{inc ? '収入' : '支出'}</button>
          )
        })}
      </div>

      {/* Amount display */}
      <div style={{ textAlign: 'center', padding: '6px 0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 22, color: TEXT3, fontWeight: 700 }}>¥</span>
          <span style={{ fontSize: 42, fontWeight: 800, color: TEXT1, letterSpacing: -1, fontFamily: 'var(--font-mono), monospace' }}>{amountFormatted}</span>
          <span aria-hidden style={{ width: 2, height: 36, background: CORAL, borderRadius: 2, animation: 'kai-blink 1.1s steps(1) infinite' }} />
        </div>
      </div>

      {/* Fields: payee + date */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 11, padding: '9px 12px' }}>
          <div style={{ fontSize: 9, color: TEXT4, fontWeight: 700, letterSpacing: '.06em', marginBottom: 2 }}>店舗名</div>
          <input
            type="text"
            maxLength={100}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="例：サイゼリヤ"
            style={{ width: '100%', fontSize: 13, color: TEXT1, background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
          />
        </div>
        <div style={{ width: 96, background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 11, padding: '9px 12px', position: 'relative' }}>
          <div style={{ fontSize: 9, color: TEXT4, fontWeight: 700, letterSpacing: '.06em', marginBottom: 2 }}>日付</div>
          <div style={{ fontSize: 13, color: TEXT1 }}>{dateLabel}</div>
          <input
            type="date"
            value={occurredOn}
            onChange={e => setDate(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Category */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`,
          borderRadius: 11, padding: '8px 12px', marginBottom: 12, cursor: 'pointer',
          position: 'relative',
        }}
      >
        {selectedCat ? (
          <>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: `${selectedCat.color ?? CORAL}1c`,
              border: `1px solid ${selectedCat.color ?? CORAL}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CategoryIcon name={selectedCat.icon} size={16} />
            </div>
            <span style={{ fontSize: 13, color: TEXT1, fontWeight: 500 }}>{selectedCat.name}</span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: TEXT3 }}>カテゴリを選択</span>
        )}
        {classifying && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: VIOLET, fontFamily: 'var(--font-mono),monospace' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: VIOLET, animation: 'kai-blink 1s steps(2) infinite', display: 'inline-block' }}/>
            AI判別中
          </span>
        )}
        {!classifying && aiSuggestId && categoryId === aiSuggestId && (
          <span style={{ background: `${VIOLET}26`, border: `1px solid ${VIOLET}4d`, borderRadius: 5, padding: '1px 6px', color: VIOLET, fontSize: 9, fontWeight: 700 }}>AI分類済</span>
        )}
        <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT3} strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        {/* Category dropdown overlay */}
        <select
          value={categoryId}
          onChange={e => handleCatClick(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        >
          <option value="">未選択</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Keypad */}
      <Keypad onKey={handleKey} />

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 12px', background: `${RED}0d`, border: `1px solid ${RED}33`, borderRadius: 10, color: RED, fontSize: 12, marginTop: 8 }}>{error}</div>
      )}

      {/* Submit */}
      <div style={{ padding: '12px 0 0' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || amountNumber <= 0 || !memo.trim()}
          style={{
            width: '100%', padding: 14,
            background: (saving || amountNumber <= 0 || !memo.trim())
              ? 'rgba(255,255,255,.08)'
              : `linear-gradient(135deg, ${CORAL}, #7aa7ff)`,
            border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 800,
            color: (saving || amountNumber <= 0 || !memo.trim()) ? TEXT3 : '#0c0a14',
            cursor: (saving || amountNumber <= 0 || !memo.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '保存中…' : '登録する'}
        </button>
      </div>
    </div>
  )
}
