'use client'

import React, { useState, useRef } from 'react'
import { parseMfCsv, decodeCsvBuffer } from '@/lib/csv-parser'
import {
  CORAL, BLUE, VIOLET, GREEN, AMBER,
  TEXT1, TEXT3, TEXT4, TEXT5,
  ImportResult, BackBtn,
} from './_shared'

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

function SmallStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: '8px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: TEXT3, letterSpacing: '.08em', fontWeight: 600, textTransform: 'uppercase' as const }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono),monospace', color, marginTop: 2, letterSpacing: '-.01em' }}>{value}</div>
    </div>
  )
}

export function CsvImportTab({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
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
          <SmallStat label="新規" value={result.inserted} color={GREEN}/>
          <SmallStat label="スキップ" value={result.skipped} color={TEXT3}/>
          <SmallStat label="AI分類" value={result.classified} color={VIOLET}/>
        </div>
        <button onClick={onDone} className="kai-btn kai-btn-primary" style={{ width: '100%', marginTop: 4 }}>完了</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackBtn onClick={onBack}/>

      <div style={{ marginTop: -6 }}>
        <div style={{ fontSize: 9, color: TEXT3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono),monospace' }}>ADD ENTRY / CSV</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em', marginTop: 2 }}>CSV取込み</div>
      </div>

      <CsvStepIndicator activeStep={file ? 2 : 1}/>

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

      {preview?.errors && preview.errors.length > 0 && (
        <div style={{ padding: '10px 12px', background: `${AMBER}0a`, border: `1px solid ${AMBER}28`, borderRadius: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginBottom: 4 }}>⚠ 警告</p>
          {preview.errors.slice(0, 3).map((e, i) => <p key={i} style={{ fontSize: 11, color: `${AMBER}cc` }}>{e}</p>)}
          {preview.errors.length > 3 && <p style={{ fontSize: 11, color: `${AMBER}88` }}>…他 {preview.errors.length - 3} 件</p>}
        </div>
      )}

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
