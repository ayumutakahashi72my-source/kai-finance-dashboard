'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'
import { Skeleton } from '@/components/ui/Skeleton'

// まとめて除外がこの件数以上のときは確認ステップを挟む
const BULK_CONFIRM_THRESHOLD = 5

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

type DupTx = {
  id: string
  occurred_on: string
  amount: number
  payee: string
  source_account: string | null
  excluded: boolean
  categories: { name: string; color: string | null; icon: string | null } | null
}

type DupGroup = DupTx[]

function pickExcludeTargets(group: DupGroup): string[] {
  const active = group.filter((tx) => !tx.excluded)
  if (active.length <= 1) return []
  // 1件目を残し、2件目以降を除外候補にする
  return active.slice(1).map((tx) => tx.id)
}

export function DuplicateChecker() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groups, setGroups] = useState<DupGroup[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoResult, setAutoResult] = useState<{ learned: number; excluded: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingBulk, setConfirmingBulk] = useState(false)

  // パネルを開く前でも重複件数がわかるよう、マウント時に軽量GETだけ叩いてバッジを出す
  // （自動除外の実行は handleCheck でユーザーが明示的にパネルを開いた時のみ行う）
  const { data: badgeData } = useQuery({
    queryKey: ['duplicate-count'],
    queryFn: () => fetch('/api/transactions/duplicates').then((r) => r.json()) as Promise<{ groups: DupGroup[] }>,
    staleTime: 60_000,
  })
  const badgeCount = groups === null
    ? (badgeData?.groups ?? []).filter((g) => g.filter((tx) => !tx.excluded).length >= 2).length
    : null

  async function handleCheck() {
    if (open && groups !== null) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    setAutoResult(null)
    setError(null)
    setConfirmingBulk(false)
    try {
      // 1. 学習パターンで自動除外を実行（補助処理: 失敗しても手動チェックは続行）
      try {
        const autoRes = await fetch('/api/transactions/duplicates/auto-resolve', { method: 'POST' })
        if (autoRes.ok) {
          const auto = await autoRes.json() as { learned: number; excluded: number }
          if (auto.excluded > 0 || auto.learned > 0) {
            setAutoResult(auto)
            qc.invalidateQueries({ queryKey: ['transactions'] })
          }
        }
      } catch { /* 自動除外の失敗は無視して手動チェックへ進む */ }

      // 2. 残りの重複候補を取得
      const res = await fetch('/api/transactions/duplicates')
      if (!res.ok) throw new Error('重複チェックに失敗しました')
      const data = await res.json() as { groups: DupGroup[] }
      setGroups(data.groups ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '重複チェックに失敗しました')
      setGroups([]) // パネルが固まらないよう空状態に
    } finally {
      setLoading(false)
    }
  }

  async function bulkExclude(ids: string[]) {
    if (!ids.length) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/transactions/bulk-exclude', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, excluded: true }),
      })
      if (!res.ok) throw new Error('除外に失敗しました')
      // 成功時のみローカルステートを更新（DBと乖離させない）
      setGroups((prev) => {
        if (!prev) return prev
        const idSet = new Set(ids)
        return prev.map((g) =>
          g.map((t) => (idSet.has(t.id) ? { ...t, excluded: true } : t))
        )
      })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['duplicate-count'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : '除外に失敗しました')
    } finally {
      setBusy(false)
      setConfirmingBulk(false)
    }
  }

  function handleBulkExcludeClick(ids: string[]) {
    if (ids.length >= BULK_CONFIRM_THRESHOLD && !confirmingBulk) {
      setConfirmingBulk(true)
      return
    }
    bulkExclude(ids)
  }

  async function toggleSingle(tx: DupTx) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded: !tx.excluded, excluded_reason: 'duplicate' }),
      })
      if (!res.ok) throw new Error('更新に失敗しました')
      // 成功時のみローカルステートを更新（DBと乖離させない）
      setGroups((prev) => {
        if (!prev) return prev
        return prev.map((g) =>
          g.map((t) => (t.id === tx.id ? { ...t, excluded: !t.excluded } : t))
        )
      })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['duplicate-count'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  // 未解決のグループ = 2件以上がactiveなもの
  const unresolvedGroups = groups?.filter((g) => g.filter((tx) => !tx.excluded).length >= 2) ?? []
  const allExcludeIds = unresolvedGroups.flatMap(pickExcludeTargets)

  return (
    <div>
      <button
        type="button"
        onClick={handleCheck}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 10,
          border: '1px solid rgba(251,191,36,0.25)',
          background: open ? 'rgba(251,191,36,0.12)' : KAI.overlayWeak,
          color: open ? '#fbbf24' : KAI.text3,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all .15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        重複チェック
        {/* パネルを開いた後は実測値(unresolvedGroups)、開く前は軽量GETの概算値(badgeCount)を表示。
            開く前から件数が見えることで、ユーザーがボタンを押す動機になる。 */}
        {(groups !== null ? unresolvedGroups.length : badgeCount ?? 0) > 0 && (
          <span style={{
            background: '#fbbf24', color: '#0a0a10',
            borderRadius: 99, fontSize: 10, fontWeight: 800,
            padding: '1px 6px', lineHeight: 1.5,
          }}>{groups !== null ? unresolvedGroups.length : badgeCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          marginTop: 8, borderRadius: 14,
          background: KAI.overlayWeak, border: `1px solid ${KAI.overlayBorder}`,
          overflow: 'hidden',
        }}>
          {/* エラーバナー */}
          {error && (
            <div style={{
              padding: '8px 14px', fontSize: 11, fontWeight: 600,
              background: 'rgba(251,113,133,.08)', color: KAI.danger,
              borderBottom: `1px solid ${KAI.border}`,
            }}>
              {error}
            </div>
          )}

          {/* 自動除外の結果バナー */}
          {autoResult && autoResult.excluded > 0 && (
            <div style={{
              padding: '8px 14px', fontSize: 11, fontWeight: 600,
              background: 'rgba(74,222,128,.08)', color: KAI.success,
              borderBottom: `1px solid ${KAI.border}`,
            }}>
              学習パターンにより {autoResult.excluded}件 を自動除外しました
              {autoResult.learned > 0 && ` (${autoResult.learned}件 新規パターン学習)`}
            </div>
          )}

          {loading ? (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2].map((i) => <Skeleton key={i} variant="block" />)}
            </div>
          ) : !groups || groups.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: KAI.text3 }}>
              {groups ? '重複取引は見つかりませんでした' : ''}
            </div>
          ) : (
            <>
              {/* ヘッダー + 一括除外ボタン */}
              <div style={{
                padding: '10px 14px', borderBottom: `1px solid ${KAI.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: KAI.text4, fontWeight: 700, letterSpacing: '.08em' }}>
                  重複の可能性 — {groups.length}グループ
                  {unresolvedGroups.length < groups.length && (
                    <span style={{ color: KAI.success, marginLeft: 6 }}>
                      ({groups.length - unresolvedGroups.length}件 解決済み)
                    </span>
                  )}
                </span>
                {allExcludeIds.length > 0 && !confirmingBulk && (
                  <button
                    onClick={() => handleBulkExcludeClick(allExcludeIds)}
                    disabled={busy}
                    style={{
                      fontSize: 10, padding: '5px 12px', borderRadius: 8,
                      border: '1px solid rgba(251,191,36,.3)',
                      background: 'rgba(251,191,36,.10)',
                      color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit',
                      fontWeight: 700, whiteSpace: 'nowrap',
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    全{allExcludeIds.length}件をまとめて除外
                  </button>
                )}
              </div>

              {/* {BULK_CONFIRM_THRESHOLD}件以上の一括除外は誤タップ防止のため一段確認を挟む */}
              {confirmingBulk && (
                <div style={{
                  padding: '10px 14px', borderBottom: `1px solid ${KAI.border}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(251,191,36,.06)',
                }}>
                  <span style={{ flex: 1, fontSize: 11.5, color: KAI.text2, lineHeight: 1.5 }}>
                    <strong style={{ color: '#fbbf24' }}>{allExcludeIds.length}件</strong>を集計除外します。よろしいですか？
                  </span>
                  <button
                    onClick={() => setConfirmingBulk(false)}
                    disabled={busy}
                    style={{
                      fontSize: 10, padding: '5px 10px', borderRadius: 8,
                      border: `1px solid ${KAI.border2}`, background: KAI.overlayWeak,
                      color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >
                    やめる
                  </button>
                  <button
                    onClick={() => handleBulkExcludeClick(allExcludeIds)}
                    disabled={busy}
                    style={{
                      fontSize: 10, padding: '5px 10px', borderRadius: 8,
                      border: '1px solid rgba(251,191,36,.3)', background: 'rgba(251,191,36,.16)',
                      color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap',
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    {busy ? '実行中…' : '除外する'}
                  </button>
                </div>
              )}

              {groups.map((group, gi) => {
                const groupTargets = pickExcludeTargets(group)
                const isResolved = groupTargets.length === 0

                return (
                  <div key={gi} style={{ borderBottom: gi < groups.length - 1 ? `1px solid ${KAI.border}` : 'none', padding: '12px 14px' }}>
                    {/* グループヘッダー */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.06em' }}>
                        {group[0].occurred_on} · ¥{Math.abs(group[0].amount).toLocaleString()}
                        {isResolved && <span style={{ color: KAI.success, marginLeft: 6 }}>解決済み</span>}
                      </span>
                      {groupTargets.length > 0 && (
                        <button
                          onClick={() => bulkExclude(groupTargets)}
                          disabled={busy}
                          style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 6,
                            border: `1px solid ${KAI.borderStrong}`,
                            background: KAI.overlayWeak,
                            color: KAI.text3, cursor: 'pointer', fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          2件目以降を除外
                        </button>
                      )}
                    </div>

                    {/* 取引一覧 */}
                    {group.map((tx, ti) => (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '6px 0',
                          borderTop: ti > 0 ? `1px solid ${KAI.border}` : 'none',
                          opacity: tx.excluded ? 0.4 : 1,
                          transition: 'opacity .15s',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: KAI.text2, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.payee}
                            {tx.excluded && <span style={{ fontSize: 10, color: KAI.text4, marginLeft: 6 }}>(除外中)</span>}
                          </p>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            <span style={{ fontSize: 10, color: KAI.text4, ...MONO }}>
                              {tx.categories?.name ?? '未分類'}
                            </span>
                            {tx.source_account && (
                              <span style={{ fontSize: 10, color: KAI.info, ...MONO }}>
                                {tx.source_account}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: tx.amount < 0 ? KAI.danger : KAI.success, ...MONO, flexShrink: 0 }}>
                          {tx.amount < 0 ? '−' : '+'}¥{Math.abs(tx.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => toggleSingle(tx)}
                          disabled={busy}
                          style={{
                            fontSize: 10, padding: '4px 9px', borderRadius: 7,
                            border: `1px solid ${tx.excluded ? 'rgba(74,222,128,.25)' : KAI.borderStrong}`,
                            background: tx.excluded ? 'rgba(74,222,128,.08)' : KAI.overlayWeak,
                            color: tx.excluded ? KAI.success : KAI.text3,
                            cursor: 'pointer', fontFamily: 'inherit',
                            flexShrink: 0, whiteSpace: 'nowrap',
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          {tx.excluded ? '戻す' : '除外'}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
