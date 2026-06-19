'use client'

import { useState, useRef, useEffect } from 'react'
import { getCategories } from '@/app/actions/categories'
import { createTransaction } from '@/app/actions/transactions'
import type { Category } from '@/lib/types'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import {
  CORAL, VIOLET, GREEN, RED, AMBER,
  TEXT1, TEXT2, TEXT3, TEXT4, TEXT5,
  today, OcrPrefill, BackBtn,
} from './_shared'

function FieldCell({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '9px 12px' }}>
      <div style={{ fontSize: 9, color: TEXT3, letterSpacing: '.08em', fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontSize: 13, color: TEXT1, marginTop: 3, fontFamily: mono ? 'var(--font-mono),monospace' : 'inherit' }}>{children}</div>
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

  const amountNumber    = parseInt(amount.replace(/\D/g, ''), 10) || 0
  const amountFormatted = amountNumber > 0 ? amountNumber.toLocaleString('ja-JP') : '0'
  const now             = new Date()
  const timeStr         = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackBtn onClick={onBack}/>

      {prefill && prefill.confidence !== undefined && prefill.confidence < 0.50 && (
        <div style={{ padding: '8px 12px', background: `${RED}0d`, border: `1px solid ${RED}33`, borderRadius: 10, fontSize: 11, color: RED }}>
          ⚠ 読み取れませんでした。手動で入力してください。
        </div>
      )}
      {prefill && prefill.confidence !== undefined && prefill.confidence >= 0.50 && prefill.confidence < 0.80 && (
        <div style={{ padding: '8px 12px', background: `${AMBER}0d`, border: `1px solid ${AMBER}33`, borderRadius: 10, fontSize: 11, color: AMBER }}>
          ⚠ 一部の項目のみ読み取れました。内容を確認してください。
        </div>
      )}

      <div style={{ marginTop: -6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, color: TEXT3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono),monospace' }}>QUICK ENTRY</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em' }}>支出を記録</div>
              {prefill && prefill.confidence !== undefined && prefill.confidence >= 0.80 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, color: VIOLET, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.06em', background: `${VIOLET}10`, border: `1px solid ${VIOLET}30`, borderRadius: 6, padding: '2px 7px' }}>
                  ✦ OCR読取
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: 10, color: TEXT3, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.08em' }}>{timeStr}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          {([false, true] as const).map((inc) => (
            <button key={String(inc)} type="button" onClick={() => setIsIncome(inc)} style={{
              padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${isIncome === inc ? (inc ? `${GREEN}55` : `${RED}55`) : 'rgba(255,255,255,.10)'}`,
              background: isIncome === inc ? (inc ? `${GREEN}12` : `${RED}12`) : 'transparent',
              color: isIncome === inc ? (inc ? GREEN : RED) : TEXT3,
            }}>{inc ? '収入' : '支出'}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: '18px', textAlign: 'center', animation: 'kai-rise .5s .10s ease-out both', position: 'relative' }}>
        <div style={{ fontSize: 10, color: TEXT3, letterSpacing: '.14em', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>金額</div>
        <label style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontFamily: 'var(--font-mono),monospace', fontWeight: 800, background: `linear-gradient(135deg, #f0f0f5 0%, ${CORAL} 80%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', letterSpacing: '-.04em', cursor: 'text', userSelect: 'none' }}>
          <span style={{ fontSize: 24, color: TEXT4, WebkitTextFillColor: TEXT4 }}>¥</span>
          <span style={{ fontSize: 46, lineHeight: 1 }}>{amountFormatted}</span>
          <span aria-hidden style={{ display: 'inline-block', width: 2, height: 34, background: CORAL, marginLeft: 1, animation: 'kai-blink 1s steps(2) infinite', WebkitTextFillColor: CORAL }}/>
          <input
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            aria-label="金額"
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'text', border: 'none', background: 'transparent' }}
          />
        </label>
        <div style={{ marginTop: 6, fontSize: 11, color: TEXT4 }}>数字キーで入力 · 後でメモを追加できます</div>
      </div>

      {categories.length > 0 && (
        <div style={{ animation: 'kai-rise .5s .20s ease-out both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: TEXT5, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>カテゴリ</span>
            {classifying && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: VIOLET, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.06em' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: VIOLET, animation: 'kai-blink 1s steps(2) infinite', display: 'inline-block' }}/>
                AI判別中
              </span>
            )}
            {!classifying && aiSuggestId && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: VIOLET, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.06em' }}>✦ AI判別</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button type="button" onClick={() => { setCatId(''); setUserOverrode(true) }} style={{
              flexShrink: 0, padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: !categoryId ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
              background: !categoryId ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${!categoryId ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)'}`,
              color: !categoryId ? TEXT1 : TEXT2,
            }}>なし</button>
            {categories.map((cat) => {
              const on = categoryId === cat.id
              const isAiSuggested = cat.id === aiSuggestId
              return (
                <button key={cat.id} type="button" onClick={() => handleCatClick(cat.id)} style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 12px', borderRadius: 99, fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: on ? `${cat.color ?? CORAL}22` : isAiSuggested ? `${VIOLET}10` : 'rgba(255,255,255,.03)',
                  border: `1px solid ${on ? (cat.color ?? CORAL) + '66' : isAiSuggested && !on ? `${VIOLET}40` : 'rgba(255,255,255,.08)'}`,
                  color: on ? (cat.color ?? CORAL) : isAiSuggested ? VIOLET : TEXT2,
                  outline: isAiSuggested && on ? `2px solid ${VIOLET}55` : 'none', outlineOffset: 1,
                }}>
                  <CategoryIcon name={cat.icon} size={13} />{cat.name}
                  {isAiSuggested && !on && <span style={{ fontSize: 8, color: VIOLET, letterSpacing: '.06em' }}>✦</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .5s .30s ease-out both' }}>
        <FieldCell label="支払先・メモ">
          <input type="text" maxLength={100} value={memo} onChange={e => setMemo(e.target.value)} placeholder="例：成城石井" className="kai-input" style={{ padding: '4px 0', border: 'none', background: 'transparent', fontSize: 13 }}/>
        </FieldCell>
        <FieldCell label="日付" mono>
          <input type="date" value={occurredOn} onChange={e => setDate(e.target.value)} className="kai-input" style={{ padding: '4px 0', border: 'none', background: 'transparent', fontSize: 12, colorScheme: 'dark' }}/>
        </FieldCell>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: `${RED}0d`, border: `1px solid ${RED}33`, borderRadius: 10, color: RED, fontSize: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2, animation: 'kai-rise .5s .40s ease-out both' }}>
        <button type="button" onClick={onBack} className="kai-btn kai-btn-secondary" style={{ flex: 1 }}>キャンセル</button>
        <button type="button" onClick={handleSave} disabled={saving || amountNumber <= 0 || !memo.trim()} className="kai-btn kai-btn-primary" style={{ flex: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {saving ? '保存中…' : '保存する'}
        </button>
      </div>
    </div>
  )
}
