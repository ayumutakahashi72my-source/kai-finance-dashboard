// components/transactions/ReceiptAnalyzingV2.tsx
//
// ② 解析中 v2 — 洗練版 (Editorial / Terminal-stream)
//
/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN-LOCKED — Claude Code への絶対ルール                              ║
 * ║   1. アクセント色は coral (#fb9477) 一色に固定。グラデや他色追加禁止。     ║
 * ║   2. ヒーロー見出し「見ています…」は Instrument Serif italic を使う。      ║
 * ║   3. ターミナル風ストリームの順番は変更しない。                            ║
 * ║      detect → extract → store → date → items → total → classify → dedupe ║
 * ║   4. レシート画像上の bounding box は STORE / DATE / ITEMS / TOTAL の     ║
 * ║      4 つ。順番に animate-in する。                                        ║
 * ║   5. fetch エラーは onError で親に投げる。エラー UI はここで作らない。     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝ */

'use client'

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'
import { MONO_STYLE } from '@/components/kai/shared'
import type { OcrResult } from '@/lib/ocr'

interface Props {
  image: File
  onDone: (result: OcrResult) => void
  onError: (error: string) => void
  onCancel: () => void
}

const PAPER = '#f5f1e6'
const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-serif), "Instrument Serif", "Hiragino Mincho ProN", serif',
  fontStyle: 'italic',
}

interface StreamLine {
  t: string
  out: string
  tone: 'ok' | 'ink' | 'coral'
}

const STREAM: StreamLine[] = [
  { t: '> vision.detect_document()', out: 'ok',               tone: 'ok'    },
  { t: '> ocr.extract_blocks()',     out: '42 blocks',        tone: 'ink'   },
  { t: '> store',                    out: '読み取り中…',      tone: 'coral' },
  { t: '> date',                     out: '日付を検出…',      tone: 'coral' },
  { t: '> items',                    out: '明細を解析…',      tone: 'coral' },
  { t: '> total.parse()',            out: '合計を確認…',      tone: 'coral' },
  { t: '> classify.category()',      out: 'カテゴリ判別…',    tone: 'coral' },
  { t: '> dedupe.scan(24h)',         out: 'no match ✓',       tone: 'ok'    },
]

type Stage = 0 | 1 | 2 | 3 | 4

function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const maxShort = 1600, maxLong = 2800
      const isPortrait = height >= width
      const [longSide, shortSide] = isPortrait ? [height, width] : [width, height]
      const ratio = Math.min(maxLong / longSide, maxShort / shortSide, 1)
      width  = Math.round(width  * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.1)'
      ctx.drawImage(img, 0, 0, width, height)
      ctx.filter = 'none'
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('canvas.toBlob failed')); return }
        resolve(blob)
      }, 'image/jpeg', 0.82)
    }
    img.onerror = reject
    img.src = url
  })
}

export function ReceiptAnalyzingV2({ image, onDone, onError, onCancel }: Props) {
  const [stage, setStage] = React.useState<Stage>(0)
  const [hasResult, setHasResult] = React.useState(false)
  const pct = hasResult ? 100 : Math.round((stage / 4) * 92)
  const pendingResult = React.useRef<OcrResult | null>(null)

  // bounding box を 600ms ごとに 1 つずつ点灯
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasResult) { setStage(4); return }
    if (stage >= 4) return
    const id = setTimeout(() => setStage((stage + 1) as Stage), 620)
    return () => clearTimeout(id)
  }, [stage, hasResult])

  // 解析完了 → 400ms の余韻 → onDone
  React.useEffect(() => {
    if (hasResult && pendingResult.current) {
      const t = setTimeout(() => {
        if (pendingResult.current) onDone(pendingResult.current)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [hasResult, onDone])

  // Canvas 前処理 → /api/transactions/ocr
  React.useEffect(() => {
    const ac = new AbortController()
    ;(async () => {
      try {
        const blob = await preprocessImage(image)
        const formData = new FormData()
        formData.append('file', blob, 'receipt.jpg')
        const res = await fetch('/api/transactions/ocr', {
          method: 'POST',
          body: formData,
          signal: ac.signal,
        })
        if (!res.ok) {
          if (!ac.signal.aborted) onError(`HTTP ${res.status}`)
          return
        }
        const json = await res.json() as OcrResult & { error?: string }
        if (ac.signal.aborted) return
        pendingResult.current = json
        setHasResult(true)
      } catch (err) {
        if (ac.signal.aborted) return
        onError(err instanceof Error ? err.message : 'network_error')
      }
    })()
    return () => { ac.abort() }
  }, [image, onError])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: KAI.bgCard,
        color: KAI.text1,
        fontFamily: 'var(--font-sans), Inter, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* warm vignette */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 460px 320px at 50% 24%, ${KAI.coral}1a, transparent 65%),
            radial-gradient(ellipse 360px 240px at 50% 84%, ${KAI.coral}10, transparent 60%)
          `,
          pointerEvents: 'none',
        }}
      />

      {/* header */}
      <div
        style={{
          padding: 'calc(env(safe-area-inset-top, 14px) + 44px) 22px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <button
          onClick={onCancel}
          aria-label="閉じる"
          style={{
            width: 34, height: 34, borderRadius: 11,
            background: 'rgba(255,255,255,.04)',
            border: `1px solid ${KAI.border2}`,
            color: KAI.text1, fontSize: 16,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ×
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            aria-hidden
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: KAI.coral,
              boxShadow: `0 0 6px ${KAI.coral}`,
              animation: 'ocrv2-blink 1.2s ease-in-out infinite',
            }}
          />
          <p style={{ margin: 0, ...MONO_STYLE, fontSize: 10, letterSpacing: '.24em', color: KAI.coral, fontWeight: 700 }}>
            ANALYZING
          </p>
        </div>
        <span
          aria-live="polite"
          style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', ...MONO_STYLE, fontSize: 11, color: KAI.text3 }}
        >
          {pct}%
        </span>
      </div>

      {/* hairline progress */}
      <div style={{ padding: '10px 22px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ height: 2, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%', width: `${pct}%`,
              background: KAI.coral,
              boxShadow: `0 0 10px ${KAI.coral}aa`,
              transition: 'width .4s cubic-bezier(.5,.1,.2,1)',
            }}
          />
        </div>
      </div>

      {/* annotated receipt */}
      <ReceiptWithAnnotations file={image} stage={stage} />

      {/* terminal stream */}
      <div
        style={{
          margin: '20px 20px 0',
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(0,0,0,.32)',
          border: `1px solid ${KAI.border2}`,
          ...MONO_STYLE,
          fontSize: 10.5,
          lineHeight: 1.7,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {STREAM.map((l, i) => {
          const tone = l.tone === 'ok' ? KAI.success : l.tone === 'coral' ? KAI.coral : KAI.text1
          const active = hasResult ? true : i < (stage * 2 + 1)
          return (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 8,
                animation: `ocrv2-stream .35s ${0.08 + i * 0.09}s both ease-out`,
                opacity: active ? 1 : 0.35,
                transition: 'opacity .25s',
              }}
            >
              <span style={{ color: KAI.text3, whiteSpace: 'nowrap' }}>{l.t}</span>
              <span style={{ color: tone, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', minWidth: 0 }}>
                {l.out}
              </span>
            </div>
          )
        })}
        <div style={{ marginTop: 4, color: KAI.coral, letterSpacing: '.04em' }}>
          <span style={{ animation: 'ocrv2-caret 1s steps(1) infinite' }}>▍</span>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '24px 22px calc(env(safe-area-inset-bottom, 22px) + 22px)',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <p style={{ margin: 0, ...SERIF, fontSize: 22, color: KAI.text1, letterSpacing: '-.01em' }}>
          見ています<span style={{ color: KAI.coral }}>…</span>
        </p>
        <button
          onClick={onCancel}
          style={{
            marginTop: 14, background: 'transparent', border: 'none',
            color: KAI.text3, fontSize: 11, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '.02em',
          }}
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Receipt + bounding boxes
// ────────────────────────────────────────────────────────────
function ReceiptWithAnnotations({ file, stage }: { file: File; stage: Stage }) {
  const [url, setUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    const u = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  const W = 196
  const annots = [
    { id: 'store', show: stage >= 1, top:  6, left:  6, w: 88, h:  9, label: 'STORE', side: 'left'  as const },
    { id: 'date',  show: stage >= 2, top: 22, left:  6, w: 50, h:  8, label: 'DATE',  side: 'left'  as const },
    { id: 'items', show: stage >= 3, top: 34, left:  4, w: 92, h: 32, label: 'ITEMS', side: 'right' as const },
    { id: 'total', show: stage >= 4, top: 72, left:  4, w: 92, h: 10, label: 'TOTAL', side: 'right' as const },
  ]

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22, position: 'relative', zIndex: 1 }}>
      <div style={{ position: 'relative', width: W, height: 278, transform: 'rotate(-2deg)', transformOrigin: 'center' }}>
        {/* paper background */}
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 4,
            background: url
              ? `center/cover no-repeat url(${url}), linear-gradient(180deg, ${PAPER}, #ece6d6)`
              : `linear-gradient(180deg, ${PAPER}, #ece6d6)`,
            boxShadow: `0 24px 50px rgba(0,0,0,.55), 0 0 0 1px ${KAI.coral}33`,
            overflow: 'hidden',
          }}
          aria-hidden
        >
          {/* deckle edges */}
          <svg width="100%" height="6" preserveAspectRatio="none" viewBox="0 0 200 6" style={{ position: 'absolute', top: 0, left: 0 }} aria-hidden>
            <path d={`M0 6 ${Array.from({ length: 25 }).map((_, i) => `L${i * 8} ${i % 2 ? 2 : 4}`).join(' ')} L200 6 Z`} fill={PAPER} />
          </svg>
          <svg width="100%" height="6" preserveAspectRatio="none" viewBox="0 0 200 6" style={{ position: 'absolute', bottom: 0, left: 0 }} aria-hidden>
            <path d={`M0 0 ${Array.from({ length: 25 }).map((_, i) => `L${i * 8} ${i % 2 ? 4 : 2}`).join(' ')} L200 0 Z`} fill="#ece6d6" />
          </svg>
        </div>

        {/* scan beam */}
        <div
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, height: 24, top: 0,
            background: `linear-gradient(180deg, transparent, ${KAI.coral}55, transparent)`,
            mixBlendMode: 'screen',
            animation: 'ocrv2-scanv 1.8s linear infinite',
            borderRadius: 4, pointerEvents: 'none',
          }}
        />

        {/* annotations */}
        {annots.map((a, i) =>
          a.show ? (
            <span
              key={a.id}
              style={{
                position: 'absolute',
                top: `${a.top}%`, left: `${a.left}%`,
                width: `${a.w}%`, height: `${a.h}%`,
                border: `1.5px solid ${KAI.coral}`,
                borderRadius: 3,
                boxShadow: `0 0 0 1px rgba(251,148,119,.2), 0 0 14px rgba(251,148,119,.35)`,
                animation: `ocrv2-box-in .55s ${0.1 + i * 0.18}s cubic-bezier(.3,1.3,.5,1) both`,
                pointerEvents: 'none',
              }}
              aria-hidden
            >
              <span
                style={{
                  position: 'absolute',
                  top: -16,
                  [a.side]: -2,
                  background: KAI.coral,
                  color: '#06060a',
                  ...MONO_STYLE,
                  fontSize: 8, fontWeight: 700,
                  letterSpacing: '.16em',
                  padding: '2px 5px', borderRadius: 2,
                  whiteSpace: 'nowrap',
                }}
              >
                {a.label}
              </span>
            </span>
          ) : null
        )}
      </div>
    </div>
  )
}
