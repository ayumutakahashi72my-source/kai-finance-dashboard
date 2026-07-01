'use client'

import { useRef, useState } from 'react'
import { KAI } from '@/lib/kai-tokens'
import { resolveIconName } from '@/lib/category-icons'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import type { Transaction } from '@/lib/types'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

const REVEAL = 72   // スワイプで露出する削除ボタンの幅
const DRAG_THRESHOLD = 6 // これ未満の移動量はタップ扱い（編集を開く）

/**
 * 取引一覧の1行。
 * - タップ: 編集ダイアログを開く（MoneyForward ME / Zaim 準拠）
 * - 左スワイプ: 削除ボタンを露出（確認ダイアログなし。5秒間のUndoトーストで安全性を担保）
 * - 未分類の取引はカテゴリアイコンに警告ドットを表示
 */
export function TransactionRow({
  tx,
  compact = false,
  rowBg,
  onEdit,
  onDeleteRequest,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  tx: Transaction
  compact?: boolean
  rowBg: string
  onEdit: (tx: Transaction) => void
  onDeleteRequest: (tx: Transaction) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (tx: Transaction) => void
}) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const gesture = useRef({ startX: 0, dragging: false, moved: false, baseX: 0 })

  function onPointerDown(e: React.PointerEvent) {
    if (selectMode) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    gesture.current = { startX: e.clientX, dragging: true, moved: false, baseX: dragX }
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!gesture.current.dragging) return
    const dx = e.clientX - gesture.current.startX
    if (Math.abs(dx) > DRAG_THRESHOLD) gesture.current.moved = true
    const next = Math.min(0, Math.max(-REVEAL - 20, gesture.current.baseX + dx))
    setDragX(next)
  }
  function endDrag() {
    if (!gesture.current.dragging) return
    gesture.current.dragging = false
    setIsDragging(false)
    setDragX((x) => (x < -REVEAL / 2 ? -REVEAL : 0))
  }
  function handleClick() {
    if (selectMode) { onToggleSelect?.(tx); return }
    if (gesture.current.moved) { gesture.current.moved = false; return } // ドラッグ後のクリックは無視
    if (dragX < -1) { setDragX(0); return } // 開いた状態でのタップは閉じる
    onEdit(tx)
  }

  const uncategorized = !tx.category_id
  const iconSize = compact ? 28 : 38
  const catColor = tx.categories?.color ?? KAI.text3

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 削除アクション（スワイプで露出） */}
      {!selectMode && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: REVEAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: KAI.danger,
        }}>
          <button
            type="button"
            onClick={() => { onDeleteRequest(tx); setDragX(0) }}
            aria-label={`${tx.payee}を削除`}
            style={{ width: '100%', height: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            削除
          </button>
        </div>
      )}

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: compact ? 10 : 12,
          padding: compact ? '10px 14px' : '12px 14px',
          background: rowBg,
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform .18s ease-out',
          cursor: 'pointer',
          opacity: tx.excluded ? 0.45 : 1,
          touchAction: 'pan-y',
        }}
      >
        {selectMode && (
          <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
            border: `1.5px solid ${selected ? KAI.blue : KAI.border2}`,
            background: selected ? KAI.blue : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0c0a14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            )}
          </div>
        )}

        <div style={{
          position: 'relative',
          width: iconSize, height: iconSize, borderRadius: compact ? 8 : 12, flexShrink: 0,
          background: `${catColor}1c`, border: `1px solid ${catColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CategoryIcon name={resolveIconName(tx.categories?.name ?? '') ?? 'Tag'} size={compact ? 13 : 16} />
          {uncategorized && (
            <span
              aria-hidden
              style={{
                position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%',
                background: '#fbbf24', border: `2px solid ${rowBg}`,
              }}
            />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: compact ? 12.5 : 13, fontWeight: 500, color: KAI.text1, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tx.excluded && <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,.12)', borderRadius: 4, padding: '1px 5px', marginRight: 6 }}>集計除外</span>}
            {tx.payee}
          </p>
          <div style={{ fontSize: 10, color: KAI.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={uncategorized ? { color: '#fbbf24', fontWeight: 700 } : undefined}>
              {tx.categories?.name ?? '未分類'}
            </span>
            {tx.source === 'auto' && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text4, display: 'inline-block' }} />
                <span style={{ ...MONO }}>MF同期</span>
              </>
            )}
            {tx.source === 'csv' && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: KAI.text4, display: 'inline-block' }} />
                <span style={{ background: `${KAI.violet}1c`, border: `1px solid ${KAI.violet}4d`, borderRadius: 4, padding: '1px 5px', color: KAI.violet, fontSize: 9, fontWeight: 700 }}>CSV</span>
              </>
            )}
          </div>
        </div>

        <span style={{ fontSize: compact ? 13 : 14, fontWeight: 700, ...MONO, flexShrink: 0, color: tx.amount < 0 ? KAI.danger : KAI.success }}>
          {tx.amount < 0 ? '−' : '+'}¥{Math.abs(tx.amount).toLocaleString('ja-JP')}
        </span>
      </div>
    </div>
  )
}
