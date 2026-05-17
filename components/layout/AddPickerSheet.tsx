'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCategories } from '@/app/actions/categories'
import { createTransaction } from '@/app/actions/transactions'
import { parseMfCsv, decodeCsvBuffer } from '@/lib/csv-parser'
import type { Category } from '@/lib/types'

// ── design tokens (inline to avoid 'use client' boundary issues with KAI shared) ──
const CORAL  = '#fb9477'
const BLUE   = '#7aa7ff'
const VIOLET = '#a78bfa'
const GREEN  = '#4ade80'
const RED    = '#fb7185'
const AMBER  = '#fbbf24'
const TEXT1  = '#f0f0f5'
const TEXT2  = '#c4c4d0'
const TEXT3  = '#8b8ba0'
const TEXT4  = '#5e5e72'
const TEXT5  = '#3e3e55'
const BG     = 'rgba(18,16,28,0.97)'

type Step = 'picker' | 'manual' | 'csv' | 'mf'

interface ImportResult {
  inserted: number
  skipped: number
  classified: number
  categoriesCreated: number
  parseErrors: string[]
}
interface SyncResult {
  inserted: number
  skipped: number
  year: number
  month: number
}

const today = () => new Date().toISOString().split('T')[0]

// ── Sheet chrome (backdrop + container) ──────────────────────────────────────
function SheetChrome({ onBackdropClick, children }: { onBackdropClick: () => void; children: React.ReactNode }) {
  return (
    <>
      <div
        onClick={onBackdropClick}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          animation: 'kai-rise 0.18s ease-out both',
        }}
      />
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 51,
          background: BG,
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderBottomWidth: 0,
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 48px',
          animation: 'kai-sheet-up 0.22s cubic-bezier(.16,1,.3,1) both',
          boxShadow: '0 -16px 48px rgba(0,0,0,0.6)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
        role="dialog"
        aria-modal
      >
        {/* handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.15)', margin: '0 auto 20px' }} />
        {children}
      </div>
    </>
  )
}

// ── Back button ───────────────────────────────────────────────────────────────
function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: TEXT3, fontSize: 13,
        fontWeight: 600, cursor: 'pointer', padding: '0 0 16px',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      戻る
    </button>
  )
}

// ── Step: Picker ──────────────────────────────────────────────────────────────
function PickerStep({ onPick, onClose }: { onPick: (s: Step) => void; onClose: () => void }) {
  const OPTIONS = [
    {
      key: 'manual' as Step,
      accent: CORAL,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
        </svg>
      ),
      title: '手入力',
      desc: '1件ずつ素早く記録 · 約10秒',
      tag: '今すぐ',
    },
    {
      key: 'csv' as Step,
      accent: BLUE,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/><path d="M8 13h2M8 17h6M12 13h4"/>
        </svg>
      ),
      title: 'CSV取込み',
      desc: 'クレカ明細・銀行データを一括取込',
      tag: '一括',
    },
    {
      key: 'mf' as Step,
      accent: VIOLET,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={VIOLET} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
      ),
      title: 'MoneyForward Me 連携',
      desc: '毎朝6:00に自動で全口座を取込',
      tag: '自動',
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>支出を追加</p>
          <p style={{ fontSize: 12, color: TEXT4, marginTop: 2 }}>どの方法で記録しますか？</p>
        </div>
        <button
          onClick={onClose}
          style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT3, cursor: 'pointer' }}
          aria-label="閉じる"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2L13 13M13 2L2 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map((opt, idx) => (
          <button
            key={opt.key}
            onClick={() => onPick(opt.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: `${opt.accent}0d`,
              border: `1px solid ${opt.accent}28`,
              borderRadius: 16, padding: '14px 16px',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              animation: `kai-rise .4s ${0.05 + idx * 0.07}s ease-out both`,
            }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `${opt.accent}1a`, border: `1px solid ${opt.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {opt.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: TEXT1 }}>{opt.title}</span>
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono), monospace', fontWeight: 700, letterSpacing: '.08em', color: opt.accent, background: `${opt.accent}1a`, border: `1px solid ${opt.accent}33`, borderRadius: 5, padding: '1px 5px' }}>{opt.tag}</span>
              </div>
              <p style={{ fontSize: 11, color: TEXT3, marginTop: 3 }}>{opt.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: TEXT4 }}><path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ))}
      </div>
    </>
  )
}

// ── Helper: FieldCell ─────────────────────────────────────────────────────────
function FieldCell({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '9px 12px' }}>
      <div style={{ fontSize: 9, color: TEXT3, letterSpacing: '.08em', fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontSize: 13, color: TEXT1, marginTop: 3, fontFamily: mono ? 'var(--font-mono),monospace' : 'inherit' }}>{children}</div>
    </div>
  )
}

// ── Step: Manual entry ────────────────────────────────────────────────────────
function ManualStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
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

  // debounced AI classify when memo changes
  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current)
    const trimmed = memo.trim()
    if (trimmed.length < 2) {
      setAiSuggestId(null)
      return
    }
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

  const amountNumber = parseInt(amount.replace(/\D/g, ''), 10) || 0
  const amountFormatted = amountNumber > 0 ? amountNumber.toLocaleString('ja-JP') : '0'

  const now = new Date()
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  function handleCatClick(id: string) {
    setCatId(id)
    setUserOverrode(true)
  }

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

      {/* Title row */}
      <div style={{ marginTop: -6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, color: TEXT3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono),monospace' }}>QUICK ENTRY</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em', marginTop: 2 }}>支出を記録</div>
          </div>
          <span style={{ fontSize: 10, color: TEXT3, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.08em' }}>{timeStr}</span>
        </div>
        {/* Income / Expense toggle */}
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

      {/* Amount card */}
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

      {/* Category */}
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, color: VIOLET, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.06em' }}>
                ✦ AI判別
              </span>
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
                  outline: isAiSuggested && on ? `2px solid ${VIOLET}55` : 'none',
                  outlineOffset: 1,
                }}>
                  {cat.icon && <span>{cat.icon}</span>}{cat.name}
                  {isAiSuggested && !on && <span style={{ fontSize: 8, color: VIOLET, letterSpacing: '.06em' }}>✦</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Memo + Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .5s .30s ease-out both' }}>
        <FieldCell label="支払先・メモ">
          <input
            type="text" maxLength={100}
            value={memo} onChange={e => setMemo(e.target.value)}
            placeholder="例：成城石井"
            className="kai-input"
            style={{ padding: '4px 0', border: 'none', background: 'transparent', fontSize: 13 }}
          />
        </FieldCell>
        <FieldCell label="日付" mono>
          <input
            type="date"
            value={occurredOn} onChange={e => setDate(e.target.value)}
            className="kai-input"
            style={{ padding: '4px 0', border: 'none', background: 'transparent', fontSize: 12, colorScheme: 'dark' }}
          />
        </FieldCell>
      </div>

      {error && (
        <div style={{ padding: '8px 12px', background: `${RED}0d`, border: `1px solid ${RED}33`, borderRadius: 10, color: RED, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* Actions */}
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

// ── Helper: CsvStepIndicator ─────────────────────────────────────────────────
function CsvStepIndicator({ activeStep }: { activeStep: 1 | 2 | 3 }) {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: '選択' },
    { n: 2, label: 'マッピング' },
    { n: 3, label: '確認' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {steps.map((s, i) => {
        const state = s.n < activeStep ? 'done' : s.n === activeStep ? 'active' : 'pending'
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '.08em', fontFamily: 'var(--font-mono),monospace', color: state === 'active' ? CORAL : state === 'done' ? GREEN : TEXT4 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, background: state === 'active' ? `${CORAL}38` : state === 'done' ? 'rgba(74,222,128,.2)' : 'rgba(255,255,255,.04)', border: `1px solid ${state === 'active' ? CORAL : state === 'done' ? 'rgba(74,222,128,.4)' : 'rgba(255,255,255,.1)'}` }}>
                {state === 'done' ? '✓' : s.n}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.08)' }}/>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Helper: SmallStat ─────────────────────────────────────────────────────────
function SmallStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: TEXT3, letterSpacing: '.08em', fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono),monospace', color, marginTop: 2, letterSpacing: '-.01em' }}>{value}</div>
    </div>
  )
}

// ── Step: CSV Import ──────────────────────────────────────────────────────────
function CsvStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<{ count: number; errors: string[]; sizeKb: number } | null>(null)
  const [result, setResult]     = useState<ImportResult | null>(null)
  const [loading, setLoading]   = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(f: File) {
    setFile(f); setResult(null)
    const buffer = await f.arrayBuffer()
    const text = decodeCsvBuffer(buffer)
    const { rows, errors } = parseMfCsv(text)
    setPreview({ count: rows.length, errors, sizeKb: f.size / 1024 })
  }

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/transactions/import/csv', { method: 'POST', body: fd })
      const data = await res.json() as ImportResult & { error?: string }
      if (data.error) {
        setPreview(p => p ? { ...p, errors: [data.error!, ...(p.errors ?? [])] } : null)
      } else {
        setResult(data)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <BackBtn onClick={onBack}/>
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${GREEN}1a`, border: `1px solid ${GREEN}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>インポート完了</p>
          {result.classified > 0 && <p style={{ fontSize: 12, color: TEXT3, marginTop: 4 }}>AI分類: {result.classified}件{result.categoriesCreated > 0 ? `（${result.categoriesCreated}カテゴリ新規作成）` : ''}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <SmallStat label="新規" value={result.inserted}   color={GREEN}/>
          <SmallStat label="スキップ" value={result.skipped} color={TEXT3}/>
          <SmallStat label="AI分類" value={result.classified} color={VIOLET}/>
        </div>
        <button onClick={onDone} className="kai-btn kai-btn-primary" style={{ width: '100%', marginTop: 4 }}>完了</button>
      </div>
    )
  }

  // ── Upload screen ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackBtn onClick={onBack}/>

      {/* Title row */}
      <div style={{ marginTop: -6 }}>
        <div style={{ fontSize: 9, color: TEXT3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono),monospace' }}>ADD ENTRY / CSV</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em', marginTop: 2 }}>CSV取込み</div>
      </div>

      {/* Step indicator */}
      <CsvStepIndicator activeStep={file ? 2 : 1}/>

      {/* File chip (after selection) */}
      {file && preview ? (
        <section style={{ background: 'rgba(122,167,255,.06)', border: `1px solid ${BLUE}38`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, animation: 'kai-rise .35s ease-out both' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, color: BLUE, background: 'rgba(122,167,255,.12)', border: `1px solid ${BLUE}47`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: TEXT1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
            <div style={{ fontSize: 10, color: TEXT3, marginTop: 2, fontFamily: 'var(--font-mono),monospace', letterSpacing: '.04em' }}>{preview.count}件 · {preview.sizeKb.toFixed(1)} KB · MF形式</div>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()} style={{ fontSize: 11, color: BLUE, background: 'transparent', border: `1px solid ${BLUE}4d`, borderRadius: 8, padding: '5px 9px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>変更</button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
        </section>
      ) : (
        /* Drop zone (before selection) */
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: '32px 20px', cursor: 'pointer', border: `2px dashed ${dragOver ? BLUE + '88' : 'rgba(255,255,255,.12)'}`, background: dragOver ? `${BLUE}08` : 'rgba(255,255,255,.02)', transition: 'all .15s', animation: 'kai-rise .4s .08s ease-out both' }}
        >
          <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}/>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={TEXT4} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p style={{ fontSize: 13, color: TEXT3 }}>CSVをドロップ、またはタップして選択</p>
          <p style={{ fontSize: 11, color: TEXT5 }}>マネーフォワードMeからエクスポートしたファイル</p>
        </div>
      )}

      {/* Parse warnings */}
      {preview?.errors && preview.errors.length > 0 && (
        <div style={{ padding: '10px 12px', background: `${AMBER}0a`, border: `1px solid ${AMBER}28`, borderRadius: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginBottom: 4 }}>⚠ 警告</p>
          {preview.errors.slice(0, 3).map((e, i) => <p key={i} style={{ fontSize: 11, color: `${AMBER}cc` }}>{e}</p>)}
          {preview.errors.length > 3 && <p style={{ fontSize: 11, color: `${AMBER}88` }}>…他 {preview.errors.length - 3} 件</p>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button onClick={onBack} className="kai-btn kai-btn-secondary" style={{ flex: 1 }}>キャンセル</button>
        <button onClick={handleImport} disabled={!file || !preview || loading} className="kai-btn kai-btn-primary" style={{ flex: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {loading ? '取込み中…' : preview ? `${preview.count}件を取り込む` : '取り込む'}
        </button>
      </div>
    </div>
  )
}

// ── Step: MF Connect ──────────────────────────────────────────────────────────
const MF_FEATURES = [
  {
    bg: 'rgba(251,148,119,.18)', color: CORAL,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: '毎朝の自動同期', sub: '6:00 に当月の全口座を取込',
  },
  {
    bg: 'rgba(122,167,255,.14)', color: BLUE,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    title: '複数口座まとめて', sub: 'クレカ・銀行・電子マネー',
  },
  {
    bg: 'rgba(251,148,119,.18)', color: CORAL,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: '認証情報は暗号化', sub: '閲覧専用アクセスのみ',
  },
] as const

function MfStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [enabled,    setEnabled]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [syncing,    setSyncing]    = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError,  setSyncError]  = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/mf')
      .then(r => r.json())
      .then((d: { mf_enabled?: boolean }) => {
        setEnabled(d.mf_enabled ?? false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSync() {
    setSyncing(true); setSyncError(null); setSyncResult(null)
    const res  = await fetch('/api/settings/mf/sync', { method: 'POST' })
    const data = await res.json() as SyncResult & { error?: string }
    setSyncing(false)
    if (data.error) setSyncError(data.error)
    else { setSyncResult(data); onDone() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackBtn onClick={onBack}/>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
          <div style={{ height: 180, borderRadius: 20, background: 'rgba(255,255,255,.03)', animation: 'kai-blink 1.4s steps(2) infinite' }}/>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 64, borderRadius: 16, background: 'rgba(255,255,255,.02)', animation: `kai-blink 1.4s ${i * 0.15}s steps(2) infinite` }}/>
          ))}
        </div>
      ) : (
        <>
          {/* ── Hero connection card ── */}
          <div style={{
            background: 'rgba(167,139,250,.06)',
            border: '1px solid rgba(167,139,250,.22)',
            borderRadius: 20, padding: '24px 20px 20px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
            animation: 'kai-rise .6s ease-out both',
            boxShadow: '0 0 40px rgba(167,139,250,.05)',
          }}>
            {/* KAI ─── dot ─── MF */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {/* KAI icon */}
              <div style={{ padding: 2.5, borderRadius: 18, flexShrink: 0, background: 'linear-gradient(135deg, rgba(251,148,119,.9) 0%, rgba(122,167,255,.85) 100%)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, background: '#131020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width="32" height="32">
                    <path d="M2 17h5l4-9 7 18 4-9h8" stroke="url(#mfs-wave)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="mfs-wave" x1="2" y1="17" x2="30" y2="17" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#a78bfa"/>
                        <stop offset="100%" stopColor="#5eead4"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Animated connecting line */}
              <div style={{ flex: 1, maxWidth: 80, height: 2, position: 'relative', margin: '0 8px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.15)', borderRadius: 99 }}/>
                <div style={{
                  position: 'absolute', top: '50%', left: 0,
                  width: 10, height: 10, borderRadius: '50%',
                  background: CORAL, boxShadow: `0 0 10px ${CORAL}99`,
                  transform: 'translateY(-50%)',
                  ['--mfc-line' as string]: '68px',
                  animation: 'mfc-dot 2s cubic-bezier(.45,0,.55,1) infinite',
                }}/>
              </div>

              {/* MF icon */}
              <div style={{
                width: 64, height: 64, borderRadius: 14, flexShrink: 0,
                background: 'rgba(14,24,52,.9)',
                border: '1px solid rgba(122,167,255,.28)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: BLUE, letterSpacing: '-.04em',
              }}>MF</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em' }}>
                kai に MF Me を接続
              </div>
              <div style={{ fontSize: 12, color: TEXT3, marginTop: 6, lineHeight: 1.65 }}>
                連携すると、毎朝 6:00 に当月の取引が自動で取込まれます。
              </div>
            </div>
          </div>

          {/* ── Feature rows ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MF_FEATURES.map((f, i) => (
              <div key={f.title} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,.02)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 16, padding: '14px 16px',
                animation: `kai-rise .5s ${.1 + i * .07}s ease-out both`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: f.bg, color: f.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Connected status (enabled only) ── */}
          {enabled && (
            <div style={{
              background: 'rgba(74,222,128,.05)',
              border: '1px solid rgba(74,222,128,.22)',
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              animation: 'kai-rise .5s .28s ease-out both',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>連携済み</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: '0 0 6px rgba(74,222,128,.7)' }}/>
                </div>
                <div style={{ fontSize: 11, color: TEXT3, marginTop: 3 }}>
                  {syncResult
                    ? `${syncResult.year}年${syncResult.month}月 — 新規 ${syncResult.inserted}件`
                    : '今すぐ当月を手動取込することもできます'}
                </div>
                {syncError && <div style={{ fontSize: 11, color: RED, marginTop: 4 }}>⚠ {syncError}</div>}
              </div>
              <button
                type="button" onClick={handleSync} disabled={syncing}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(74,222,128,.10)', border: '1px solid rgba(74,222,128,.28)',
                  borderRadius: 99, padding: '7px 14px',
                  fontSize: 12, color: GREEN, fontWeight: 700,
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', flexShrink: 0,
                  opacity: syncing ? 0.5 : 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                {syncing ? '取込中…' : '今すぐ取込'}
              </button>
            </div>
          )}

          {/* ── Warning ── */}
          <div style={{
            background: 'rgba(251,191,36,.06)',
            border: '1px solid rgba(251,191,36,.28)',
            borderRadius: 14, padding: '11px 14px',
            display: 'flex', gap: 9, alignItems: 'flex-start',
            animation: 'kai-rise .5s .35s ease-out both',
          }}>
            <span style={{ fontSize: 13, color: AMBER, flexShrink: 0, marginTop: 1 }}>⚠</span>
            <div style={{ fontSize: 11, color: `${AMBER}ee`, lineHeight: 1.6 }}>
              非公式 API を使用。MF 仕様変更で停止する可能性あり。専用 MF サブアカウント推奨
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8, animation: 'kai-rise .5s .42s ease-out both' }}>
            <button type="button" onClick={onBack} style={{
              flex: 1, padding: '15px', textAlign: 'center',
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 99, color: TEXT2, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>戻る</button>

            {enabled ? (
              <button type="button" onClick={handleSync} disabled={syncing} style={{
                flex: 2, padding: '15px',
                background: `linear-gradient(135deg, ${CORAL} 0%, ${BLUE} 100%)`,
                border: 'none', borderRadius: 99,
                color: '#0c0a14', fontSize: 15, fontWeight: 800,
                cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 8px 24px ${CORAL}44`,
                opacity: syncing ? 0.7 : 1, transition: 'opacity .2s',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                {syncing ? '取込中…' : '今すぐ取込'}
              </button>
            ) : (
              <a href="/settings/integrations/mf" style={{
                flex: 2, padding: '15px', textAlign: 'center',
                background: `linear-gradient(135deg, ${CORAL} 0%, ${BLUE} 100%)`,
                borderRadius: 99, color: '#0c0a14', fontSize: 15, fontWeight: 800,
                textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: `0 8px 24px ${CORAL}44`,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                設定画面へ
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  onDone?: () => void
}

export function AddPickerSheet({ open, onClose, onDone }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('picker')

  const handleClose = useCallback(() => {
    setStep('picker')
    onClose()
  }, [onClose])

  const handleDone = useCallback(() => {
    setStep('picker')
    onClose()
    if (onDone) onDone()
    else router.refresh()
  }, [onClose, onDone, router])


  if (!open) return null

  return (
    <SheetChrome onBackdropClick={handleClose}>
      {step === 'picker' && <PickerStep onPick={setStep} onClose={handleClose}/>}
      {step === 'manual' && <ManualStep onBack={() => setStep('picker')} onDone={handleDone}/>}
      {step === 'csv'    && <CsvStep    onBack={() => setStep('picker')} onDone={handleDone}/>}
      {step === 'mf'     && <MfStep     onBack={() => setStep('picker')} onDone={handleDone}/>}
    </SheetChrome>
  )
}
