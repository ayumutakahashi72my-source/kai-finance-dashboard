'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'

interface FixedExpense {
  id:          string
  payee:       string
  avg_amount:  number
  months_seen: number
  dismissed:   boolean
  detected_at: string
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

function FixedRow({
  item,
  onDismiss,
  onRestore,
  isPending,
}: {
  item: FixedExpense
  onDismiss: (id: string) => void
  onRestore: (id: string) => void
  isPending: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      opacity: item.dismissed ? 0.45 : 1,
      transition: 'opacity .2s',
    }}>
      {/* アイコン */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: item.dismissed ? 'rgba(255,255,255,.04)' : `${KAI.violet}18`,
        border: `1px solid ${item.dismissed ? 'rgba(255,255,255,.08)' : KAI.violet + '30'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
      }}>🔄</div>

      {/* 名前・期間 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 600,
          color: item.dismissed ? KAI.text4 : KAI.text1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{item.payee}</p>
        <p style={{ fontSize: 10, color: KAI.text4, marginTop: 1 }}>
          {item.months_seen}ヶ月連続で検出
        </p>
      </div>

      {/* 金額 */}
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: item.dismissed ? KAI.text4 : KAI.coral,
        ...MONO, letterSpacing: '-.01em', flexShrink: 0,
      }}>
        ¥{item.avg_amount.toLocaleString('ja-JP')}
      </span>

      {/* ボタン */}
      {item.dismissed ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onRestore(item.id)}
          style={{
            fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
            color: KAI.text3, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            opacity: isPending ? 0.5 : 1,
          }}
        >元に戻す</button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onDismiss(item.id)}
          style={{
            fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
            background: `${KAI.danger}12`, border: `1px solid ${KAI.danger}30`,
            color: KAI.danger, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            opacity: isPending ? 0.5 : 1,
          }}
        >却下</button>
      )}
    </div>
  )
}

export function FixedExpenseCard() {
  const qc = useQueryClient()
  const [showDismissed, setShowDismissed] = useState(false)

  const { data, isLoading } = useQuery<{ data: FixedExpense[] }>({
    queryKey: ['fixed_expenses'],
    queryFn:  () => fetch('/api/fixed-expenses').then((r) => r.json()),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: ({ id, dismissed }: { id: string; dismissed: boolean }) =>
      fetch('/api/fixed-expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, dismissed }),
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '更新失敗')
        return j
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed_expenses'] }),
  })

  if (isLoading) {
    return (
      <div style={{ animation: 'kai-rise .5s .25s ease-out both' }}>
        <Skeleton variant="panel" className="h-32" />
      </div>
    )
  }

  const all       = data?.data ?? []
  const active    = all.filter((x) => !x.dismissed)
  const dismissed = all.filter((x) => x.dismissed)

  if (all.length === 0) return null

  return (
    <section style={{ animation: 'kai-rise .5s .25s ease-out both' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>
          固定費候補
        </span>
        <span style={{
          fontSize: 10, color: KAI.violet, fontWeight: 700, ...MONO,
          background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}30`,
          borderRadius: 6, padding: '2px 7px',
        }}>
          {active.length} 件
        </span>
      </div>

      <div style={{
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {/* 説明バー */}
        <div style={{
          padding: '9px 14px',
          background: `${KAI.violet}0a`,
          borderBottom: '1px solid rgba(255,255,255,.05)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 13 }}>📌</span>
          <p style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.5 }}>
            3ヶ月以上連続で検出された支払いです。固定費として管理するか確認してください。
          </p>
        </div>

        {/* アクティブな候補 */}
        {active.length > 0 ? (
          active.map((item, i) => (
            <div
              key={item.id}
              style={{ borderBottom: i < active.length - 1 || dismissed.length > 0 ? '1px solid rgba(255,255,255,.04)' : 'none' }}
            >
              <FixedRow
                item={item}
                onDismiss={(id) => mutate({ id, dismissed: true })}
                onRestore={(id) => mutate({ id, dismissed: false })}
                isPending={isPending}
              />
            </div>
          ))
        ) : (
          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: KAI.text4 }}>すべて却下済みです</p>
          </div>
        )}

        {/* 却下済みの折りたたみ */}
        {dismissed.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              style={{
                width: '100%', padding: '8px 14px', textAlign: 'left',
                background: 'transparent', border: 'none',
                borderTop: '1px solid rgba(255,255,255,.04)',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 10, color: KAI.text4, fontWeight: 600 }}>
                {showDismissed ? '▲' : '▼'} 却下済み ({dismissed.length})
              </span>
            </button>
            {showDismissed && dismissed.map((item, i) => (
              <div
                key={item.id}
                style={{ borderTop: i === 0 ? '1px solid rgba(255,255,255,.04)' : 'none' }}
              >
                <FixedRow
                  item={item}
                  onDismiss={(id) => mutate({ id, dismissed: true })}
                  onRestore={(id) => mutate({ id, dismissed: false })}
                  isPending={isPending}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
