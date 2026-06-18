'use client'

import { Pencil, Trash2, Pin, PinOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { KAI } from '@/lib/kai-tokens'
import type { Transaction } from '@/lib/types'

interface Props {
  tx: Transaction
  position: { top: number; right: number }
  onClose: () => void
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  showFixedToggle?: boolean
}

export function TransactionContextMenu({
  tx, position, onClose, onEdit, onDelete, showFixedToggle = true,
}: Props) {
  const router = useRouter()

  async function handleToggleFixed() {
    onClose()
    const res = await fetch(`/api/transactions/${tx.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_fixed: !tx.is_fixed }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <>
      <div
        role="presentation"
        aria-label="メニューを閉じる"
        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
        onClick={onClose}
      />
      <div
        role="menu"
        aria-label="取引アクション"
        style={{
          position: 'fixed', zIndex: 50,
          top: position.top, right: position.right,
          minWidth: 120, borderRadius: 12,
          background: 'rgba(20,22,32,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        <button
          role="menuitem"
          onClick={() => { onClose(); onEdit(tx) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: KAI.text2, fontFamily: 'inherit',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <Pencil size={14} /> 編集
        </button>

        {showFixedToggle && (
          <>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <button
              role="menuitem"
              onClick={handleToggleFixed}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: KAI.violet, fontFamily: 'inherit',
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${KAI.violet}10` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              {tx.is_fixed
                ? <><PinOff size={14} /> 固定費を解除</>
                : <><Pin size={14} /> 固定費にする</>
              }
            </button>
          </>
        )}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <button
          role="menuitem"
          onClick={() => { onClose(); onDelete(tx) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, color: KAI.danger, fontFamily: 'inherit',
            transition: 'background .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${KAI.danger}10` }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
        >
          <Trash2 size={14} /> 削除
        </button>
      </div>
    </>
  )
}
