'use client'

import { useState } from 'react'
import { RefreshCw, Pin, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/Skeleton'
import { KAI } from '@/lib/kai-tokens'

interface FixedExpense {
  id:           string
  payee:        string
  avg_amount:   number
  months_seen:  number
  dismissed:    boolean
  confirmed_at: string | null
  detected_at:  string
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

function FixedRow({
  item,
  onDismiss,
  onRestore,
  onConfirm,
  pendingId,
}: {
  item: FixedExpense
  onDismiss: (id: string) => void
  onRestore: (id: string) => void
  onConfirm: (id: string) => void
  pendingId: string | null
}) {
  const isConfirmed = !!item.confirmed_at
  const isPending   = pendingId === item.id

  const iconColor = item.dismissed ? KAI.text4 : isConfirmed ? KAI.green : KAI.violet
  const iconBg    = item.dismissed ? 'rgba(255,255,255,.04)' : isConfirmed ? `${KAI.green}18` : `${KAI.violet}18`
  const iconBorder = item.dismissed ? 'rgba(255,255,255,.08)' : isConfirmed ? `${KAI.green}30` : `${KAI.violet}30`

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      opacity: item.dismissed ? 0.45 : isPending ? 0.6 : 1,
      transition: 'opacity .2s',
    }}>
      {/* アイコン */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: iconBg, border: `1px solid ${iconBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor,
      }}>
        {isConfirmed
          ? <CheckCircle2 size={14} strokeWidth={2}/>
          : <RefreshCw size={14} strokeWidth={2}/>
        }
      </div>

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
      {isConfirmed ? (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
          background: `${KAI.green}18`, border: `1px solid ${KAI.green}33`,
          color: KAI.green, whiteSpace: 'nowrap', flexShrink: 0,
          letterSpacing: '.06em',
        }}>登録済み</span>
      ) : item.dismissed ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onRestore(item.id)}
          style={{
            fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
            color: KAI.text3, cursor: isPending ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >{isPending ? '…' : '元に戻す'}</button>
      ) : (
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(item.id)}
            style={{
              fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
              background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}38`,
              color: KAI.violet, cursor: isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{isPending ? '…' : '承認'}</button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => onDismiss(item.id)}
            style={{
              fontSize: 10, fontWeight: 600, padding: '4px 9px', borderRadius: 7,
              background: `${KAI.danger}12`, border: `1px solid ${KAI.danger}30`,
              color: KAI.danger, cursor: isPending ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}
          >{isPending ? '…' : '却下'}</button>
        </div>
      )}
    </div>
  )
}

export function FixedExpenseCard() {
  const qc = useQueryClient()
  const [showDismissed, setShowDismissed] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<{ data: FixedExpense[] }>({
    queryKey: ['fixed_expenses'],
    queryFn:  () => fetch('/api/fixed-expenses').then((r) => { if (!r.ok) throw new Error('取得に失敗しました'); return r.json() }),
  })

  const { mutate } = useMutation({
    mutationFn: (payload: { id: string; dismissed?: boolean; confirmed?: boolean }) => {
      setPendingId(payload.id)
      return fetch('/api/fixed-expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error ?? '更新失敗')
        return j
      })
    },
    onSettled: () => setPendingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fixed_expenses'] }),
  })

  if (isLoading) {
    return (
      <div style={{ animation: 'kai-rise .5s .25s ease-out both' }}>
        <Skeleton variant="panel" className="h-32" />
      </div>
    )
  }

  if (isError) return (
    <p style={{ fontSize: 11, color: KAI.danger, padding: '8px 0' }}>固定費候補の取得に失敗しました</p>
  )

  const all       = data?.data ?? []
  const active    = all.filter((x) => !x.dismissed && !x.confirmed_at)
  const confirmed = all.filter((x) => !!x.confirmed_at)
  const dismissed = all.filter((x) => x.dismissed)

  if (all.length === 0) return null

  return (
    <section style={{ animation: 'kai-rise .5s .25s ease-out both' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>
          固定費候補
        </span>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {confirmed.length > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, ...MONO,
              background: `${KAI.green}18`, border: `1px solid ${KAI.green}30`,
              borderRadius: 6, padding: '2px 7px', color: KAI.green,
            }}>
              {confirmed.length} 登録済
            </span>
          )}
          <span style={{
            fontSize: 10, color: KAI.violet, fontWeight: 700, ...MONO,
            background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}30`,
            borderRadius: 6, padding: '2px 7px',
          }}>
            {active.length} 件
          </span>
        </div>
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
          <Pin size={13} strokeWidth={2} style={{ color: KAI.violet, flexShrink: 0 }}/>
          <p style={{ fontSize: 11, color: KAI.text3, lineHeight: 1.5 }}>
            3ヶ月以上連続で検出された支払いです。固定費として管理するか確認してください。
          </p>
        </div>

        {/* 承認済み */}
        {confirmed.map((item, i) => (
          <div
            key={item.id}
            style={{ borderBottom: i < confirmed.length - 1 || active.length > 0 || dismissed.length > 0 ? '1px solid rgba(255,255,255,.04)' : 'none' }}
          >
            <FixedRow
              item={item}
              onDismiss={(id) => mutate({ id, dismissed: true })}
              onRestore={(id) => mutate({ id, dismissed: false })}
              onConfirm={(id) => mutate({ id, confirmed: true })}
              pendingId={pendingId}
            />
          </div>
        ))}

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
                onConfirm={(id) => mutate({ id, confirmed: true })}
                pendingId={pendingId}
              />
            </div>
          ))
        ) : confirmed.length === 0 ? (
          <div style={{ padding: '20px 14px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: KAI.text4 }}>すべて却下済みです</p>
          </div>
        ) : null}

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
                  onConfirm={(id) => mutate({ id, confirmed: true })}
                  pendingId={pendingId}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
