'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

type DupTx = {
  id: string
  occurred_on: string
  amount: number
  payee: string
  categories: { name: string; color: string | null; icon: string | null } | null
}

type DupGroup = DupTx[]

export function DuplicateChecker() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<DupGroup[] | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleCheck() {
    if (open && groups !== null) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch('/api/transactions/duplicates')
      const data = await res.json() as { groups: DupGroup[] }
      setGroups(data.groups ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      setGroups((prev) => {
        if (!prev) return prev
        return prev
          .map((g) => g.filter((tx) => tx.id !== id))
          .filter((g) => g.length >= 2)
      })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  const totalDups = groups?.reduce((s, g) => s + g.length, 0) ?? 0

  return (
    <div>
      <button
        type="button"
        onClick={handleCheck}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 10,
          border: '1px solid rgba(251,191,36,0.25)',
          background: open ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.03)',
          color: open ? '#fbbf24' : KAI.text3,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all .15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        重複チェック
        {groups !== null && groups.length > 0 && (
          <span style={{
            background: '#fbbf24', color: '#0a0a10',
            borderRadius: 99, fontSize: 10, fontWeight: 800,
            padding: '1px 6px', lineHeight: 1.5,
          }}>{groups.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          marginTop: 8, borderRadius: 14,
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: KAI.text4 }}>
              チェック中…
            </div>
          ) : groups === null || groups.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: KAI.text3 }}>
              {groups?.length === 0 ? '重複取引は見つかりませんでした ✓' : ''}
            </div>
          ) : (
            <>
              <div style={{
                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 11, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em' }}>
                  重複の可能性 — {groups.length}グループ / {totalDups}件
                </span>
              </div>

              {groups.map((group, gi) => (
                <div key={gi} style={{ borderBottom: gi < groups.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                  <div style={{ padding: '8px 14px 4px', fontSize: 10, color: KAI.text4, letterSpacing: '.06em', fontWeight: 700 }}>
                    {group[0].occurred_on} · ¥{Math.abs(group[0].amount).toLocaleString()}
                  </div>
                  {group.map((tx, ti) => (
                    <div
                      key={tx.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 14px',
                        borderTop: ti > 0 ? '1px solid rgba(255,255,255,.03)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: KAI.text2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tx.payee}
                        </p>
                        <p style={{ fontSize: 10, color: KAI.text4, margin: '2px 0 0', ...MONO }}>
                          {tx.categories?.name ?? '未分類'}
                        </p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: tx.amount < 0 ? KAI.danger : KAI.success, ...MONO, flexShrink: 0 }}>
                        {tx.amount < 0 ? '−' : '+'}¥{Math.abs(tx.amount).toLocaleString()}
                      </span>

                      {confirmId === tx.id ? (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setConfirmId(null)}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              border: '1px solid rgba(255,255,255,.12)', background: 'none',
                              color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >キャンセル</button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingId === tx.id}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              border: '1px solid rgba(251,113,133,.3)',
                              background: 'rgba(251,113,133,.15)',
                              color: '#fb7185', cursor: 'pointer', fontFamily: 'inherit',
                              opacity: deletingId === tx.id ? 0.5 : 1,
                            }}
                          >{deletingId === tx.id ? '削除中…' : '削除する'}</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(tx.id)}
                          style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 8,
                            border: '1px solid rgba(251,113,133,.2)',
                            background: 'rgba(251,113,133,.08)',
                            color: '#fb7185', cursor: 'pointer', fontFamily: 'inherit',
                            flexShrink: 0,
                          }}
                        >削除</button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
