'use client'

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { KAI } from '@/lib/kai-tokens'

type AccountSummary = {
  source_account: string
  txCount: number
  excludedTxCount: number
  settingExcluded: boolean
  cardLikeCount: number
  suggestExclude: boolean
}

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }

const BankIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={KAI.blue} strokeWidth="1.9">
    <path d="M3 21h18" /><path d="M5 21V10l7-5 7 5v11" /><path d="M9 21v-6h6v6" />
  </svg>
)

function Toggle({ on, busy, onClick }: { on: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? '集計除外を解除' : '集計除外にする'}
      style={{
        width: 42, height: 25, borderRadius: 99, border: 'none', flexShrink: 0,
        // 除外はネガティブな操作ではなく設定変更なので danger(赤) ではなく blue を使う
        background: on ? KAI.blue : 'var(--kai-overlay-strong, rgba(120,120,140,.3))',
        position: 'relative', cursor: busy ? 'default' : 'pointer',
        opacity: busy ? 0.5 : 1, transition: 'background .15s', padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 20 : 3,
        width: 19, height: 19, borderRadius: '50%', background: '#fff',
        transition: 'left .15s',
      }} />
    </button>
  )
}

export function AccountSettingsPanel() {
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery<{ accounts: AccountSummary[] }>({
    queryKey: ['account-settings'],
    queryFn: () => fetch('/api/settings/accounts').then((r) => {
      if (!r.ok) throw new Error('口座情報の取得に失敗しました')
      return r.json()
    }),
  })

  const mutation = useMutation({
    mutationFn: (vars: { source_account: string; excluded: boolean }) =>
      fetch('/api/settings/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }).then((r) => {
        if (!r.ok) throw new Error('更新に失敗しました')
        return r.json()
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account-settings'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const accounts = data?.accounts ?? []

  if (isLoading) {
    return <div style={{ padding: '16px 15px', fontSize: 12.5, color: KAI.text4 }}>読み込み中…</div>
  }
  if (isError) {
    return <div style={{ padding: '16px 15px', fontSize: 12.5, color: KAI.danger }}>口座情報の取得に失敗しました</div>
  }
  if (!accounts.length) {
    return (
      <div style={{ padding: '16px 15px', fontSize: 12.5, color: KAI.text4, lineHeight: 1.6 }}>
        口座情報がありません。MF連携かCSV取込で取引を追加すると表示されます。
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '11px 15px', fontSize: 11, color: KAI.text4, borderBottom: `1px solid ${KAI.border}`, lineHeight: 1.65 }}>
        集計除外にした口座の取引は、合計・残高・スコアから外れます（一覧には薄く残ります）。
        カード明細と銀行引き落としの二重計上を防ぐのに使います。
      </div>
      {accounts.map((a, i) => (
        <div
          key={a.source_account}
          style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
            borderTop: i > 0 ? `1px solid ${KAI.border}` : 'none',
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            background: 'rgba(122,167,255,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BankIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, color: KAI.text1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {a.source_account}
            </div>
            <div style={{ fontSize: 10.5, color: KAI.text3, marginTop: 2, ...MONO }}>
              {a.txCount}件{a.excludedTxCount > 0 ? ` · 除外${a.excludedTxCount}` : ''}
            </div>
            {a.suggestExclude && (
              <div style={{
                display: 'inline-block', marginTop: 5, fontSize: 9.5, fontWeight: 700,
                color: KAI.coral, background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)',
                borderRadius: 6, padding: '2px 7px',
              }}>
                カード引落が多い口座です・集計除外を推奨
              </div>
            )}
          </div>
          <Toggle
            on={a.settingExcluded}
            busy={mutation.isPending}
            onClick={() => mutation.mutate({ source_account: a.source_account, excluded: !a.settingExcluded })}
          />
        </div>
      ))}
    </div>
  )
}
