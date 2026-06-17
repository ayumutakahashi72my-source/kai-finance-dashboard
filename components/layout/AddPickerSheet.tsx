'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ReceiptCapture } from '@/components/transactions/ReceiptCapture'
import type { OcrResult } from '@/lib/ocr'
import { CORAL, BLUE, VIOLET, AMBER, TEXT1, TEXT3, TEXT4, BG, OcrPrefill } from './tabs/_shared'
import { ManualEntryTab } from './tabs/ManualEntryTab'
import { CsvImportTab } from './tabs/CsvImportTab'
import { MfSyncTab } from './tabs/MfSyncTab'
import { useIsDemo } from '@/lib/hooks/use-is-demo'

type Step = 'picker' | 'manual' | 'csv' | 'mf' | 'receipt'

// ── Sheet chrome ──────────────────────────────────────────────────────────────
function SheetChrome({ onBackdropClick, children }: { onBackdropClick: () => void; children: React.ReactNode }) {
  return (
    <>
      <div
        onClick={onBackdropClick}
        aria-hidden
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', animation: 'kai-rise 0.18s ease-out both' }}
      />
      <div
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 51, background: BG, backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)', border: '1px solid rgba(255,255,255,0.12)', borderBottomWidth: 0, borderRadius: '24px 24px 0 0', padding: '20px 20px 48px', animation: 'kai-sheet-up 0.22s cubic-bezier(.16,1,.3,1) both', boxShadow: '0 -16px 48px rgba(0,0,0,0.6)', maxHeight: '92dvh', overflowY: 'auto' }}
        role="dialog"
        aria-modal
      >
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.15)', margin: '0 auto 20px' }} />
        {children}
      </div>
    </>
  )
}

// ── Picker step ───────────────────────────────────────────────────────────────
function PickerStep({ onPick, onClose, isDemo }: { onPick: (s: Step) => void; onClose: () => void; isDemo: boolean }) {
  const ALL_OPTIONS = [
    {
      key: 'manual' as Step, accent: CORAL,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
      title: '手入力', desc: '1件ずつ素早く記録 · 約10秒', tag: '今すぐ',
    },
    {
      key: 'receipt' as Step, accent: AMBER,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>,
      title: 'レシート読取', desc: 'カメラで撮影してAI自動入力 · 約3秒', tag: 'AI',
    },
    {
      key: 'csv' as Step, accent: BLUE,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2M8 17h6M12 13h4"/></svg>,
      title: 'CSV取込み', desc: 'クレカ明細・銀行データを一括取込', tag: '一括',
    },
    {
      key: 'mf' as Step, accent: VIOLET,
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={VIOLET} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
      title: 'MoneyForward Me 連携', desc: '毎朝6:00に自動で全口座を取込', tag: '自動',
    },
  ]
  const OPTIONS = isDemo
    ? ALL_OPTIONS.filter((o) => o.key !== 'receipt' && o.key !== 'mf')
    : ALL_OPTIONS

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>支出を追加</p>
          <p style={{ fontSize: 12, color: TEXT4, marginTop: 2 }}>どの方法で記録しますか？</p>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT3, cursor: 'pointer' }} aria-label="閉じる">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 2L13 13M13 2L2 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OPTIONS.map((opt, idx) => (
          <button
            key={opt.key}
            onClick={() => onPick(opt.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: `${opt.accent}0d`, border: `1px solid ${opt.accent}28`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', width: '100%', animation: `kai-rise .4s ${0.05 + idx * 0.07}s ease-out both` }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 13, background: `${opt.accent}1a`, border: `1px solid ${opt.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{opt.icon}</div>
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

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  onDone?: () => void
}

export function AddPickerSheet({ open, onClose, onDone }: Props) {
  const router = useRouter()
  const isDemo = useIsDemo()
  const [step, setStep] = useState<Step>('picker')
  const [ocrPrefill, setOcrPrefill] = useState<OcrPrefill | undefined>()

  const handleClose = useCallback(() => {
    setStep('picker')
    setOcrPrefill(undefined)
    onClose()
  }, [onClose])

  const handleDone = useCallback(() => {
    setStep('picker')
    setOcrPrefill(undefined)
    onClose()
    if (onDone) onDone()
    else router.refresh()
  }, [onClose, onDone, router])

  const handleImportDone = useCallback(() => {
    setStep('picker')
    setOcrPrefill(undefined)
    onClose()
    router.push('/transactions')
  }, [onClose, router])

  function handleOcrResult(data: OcrResult) {
    setOcrPrefill({
      payee:       data.payee || undefined,
      amount:      data.amount || undefined,
      occurred_on: data.occurred_on || undefined,
      confidence:  data.confidence,
    })
    setStep('manual')
  }

  if (!open) return null

  return (
    <SheetChrome onBackdropClick={handleClose}>
      {step === 'picker'  && <PickerStep onPick={setStep} onClose={handleClose} isDemo={isDemo}/>}
      {step === 'receipt' && <ReceiptCapture onResult={handleOcrResult} onCancel={() => setStep('picker')}/>}
      {step === 'manual'  && <ManualEntryTab onBack={() => { setStep('picker'); setOcrPrefill(undefined) }} onDone={handleDone} prefill={ocrPrefill}/>}
      {step === 'csv'     && <CsvImportTab   onBack={() => setStep('picker')} onDone={handleImportDone}/>}
      {step === 'mf'      && <MfSyncTab      onBack={() => setStep('picker')} onDone={handleImportDone}/>}
    </SheetChrome>
  )
}
