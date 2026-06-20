'use client'

import { useRef, useState } from 'react'
import { ReceiptAnalyzingV2 } from '@/components/transactions/ReceiptAnalyzingV2'
import { KAI } from '@/lib/kai-tokens'
import type { OcrResult } from '@/lib/ocr'

interface Props {
  onResult: (data: OcrResult) => void
  onCancel: () => void
}

const CORAL = '#fb9477'

export function ReceiptCapture({ onResult, onCancel }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleFile(file: File) {
    setSelectedFile(file)
  }

  // ファイル選択後 → 解析 UI に切り替え
  if (selectedFile) {
    return (
      <ReceiptAnalyzingV2
        image={selectedFile}
        onDone={(result) => {
          setSelectedFile(null)
          onResult(result)
        }}
        onError={() => {
          setSelectedFile(null)
          onResult({ payee: '', amount: 0, occurred_on: new Date().toISOString().split('T')[0], confidence: 0 })
        }}
        onCancel={() => setSelectedFile(null)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ marginTop: -6 }}>
        <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', fontFamily: 'var(--font-mono),monospace' }}>ADD ENTRY / RECEIPT</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 2 }}>レシート読取</div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, borderRadius: 20, padding: '40px 20px', cursor: 'pointer',
          border: `2px dashed ${CORAL}44`,
          background: `${CORAL}06`,
          transition: 'all .15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={CORAL} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/>
          <circle cx="12" cy="13" r="3"/>
        </svg>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>レシートを撮影</div>
          <div style={{ fontSize: 11, color: KAI.text3, marginTop: 4, lineHeight: 1.6 }}>
            タップしてカメラを起動<br/>または画像ファイルを選択
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: KAI.overlayWeak, border: `1px solid ${KAI.border}`, borderRadius: 12 }}>
        <div style={{ fontSize: 10, color: KAI.text4, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>撮影のコツ</div>
        {['明るい場所で平らに置く', '全体が収まるように撮影', '斜めにならないよう注意'].map((tip, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: CORAL, flexShrink: 0 }}/>
            <span style={{ fontSize: 11, color: KAI.text3 }}>{tip}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button type="button" onClick={onCancel} className="kai-btn kai-btn-secondary" style={{ flex: 1 }}>キャンセル</button>
        <button type="button" onClick={() => inputRef.current?.click()} className="kai-btn kai-btn-primary" style={{ flex: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>
          </svg>
          カメラを起動
        </button>
      </div>
    </div>
  )
}
