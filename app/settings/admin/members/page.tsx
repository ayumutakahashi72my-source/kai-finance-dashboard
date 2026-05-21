'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ChevronLeft, ShieldCheck, ShieldOff, Crown, UserPlus, Copy, Check } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { Skeleton } from '@/components/ui/Skeleton'

interface Member {
  id:           string
  user_id:      string
  role:         string
  is_admin:     boolean
  joined_at:    string
  email:        string
  display_name: string
}

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
}

export default function AdminMembersPage() {
  const qc = useQueryClient()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { mutate: createInvite, isPending: inviting } = useMutation({
    mutationFn: () =>
      fetch('/api/settings/members/invite', { method: 'POST' }).then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
        return j as { url: string }
      }),
    onSuccess: (data) => setInviteUrl(data.url),
  })

  async function handleCopy() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const { data: members, isLoading, isError } = useQuery<Member[]>({
    queryKey: ['admin_members'],
    queryFn: () =>
      fetch('/api/settings/members').then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? `HTTP ${r.status}`)
        }
        return r.json()
      }),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      fetch('/api/settings/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin }),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
        return j
      }),
    onMutate: ({ userId }) => setPendingId(userId),
    onSettled: () => {
      setPendingId(null)
      qc.invalidateQueries({ queryKey: ['admin_members'] })
    },
  })

  const panel: React.CSSProperties = {
    background: 'rgba(20,22,32,0.75)',
    backdropFilter: 'blur(24px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    overflow: 'hidden',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c0a14', color: KAI.text1 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: 28 }}>
          <Link href="/settings" style={{
            fontSize: 11, color: KAI.text4, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
          }}>
            <ChevronLeft size={13} strokeWidth={2}/> 設定に戻る
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${KAI.coral}18`, border: `1px solid ${KAI.coral}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.coral,
            }}>
              <Crown size={16} strokeWidth={2}/>
            </div>
            <div>
              <p style={{ fontSize: 10, color: KAI.coral, letterSpacing: '.16em', fontWeight: 700, textTransform: 'uppercase' }}>
                ADMIN
              </p>
              <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>メンバー権限管理</h1>
            </div>
          </div>
        </div>

        {/* 説明 */}
        <div style={{
          background: `${KAI.violet}0a`, border: `1px solid ${KAI.violet}22`,
          borderRadius: 12, padding: '10px 14px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <ShieldCheck size={14} strokeWidth={2} style={{ color: KAI.violet, marginTop: 1, flexShrink: 0 }}/>
          <p style={{ fontSize: 12, color: KAI.text3, lineHeight: 1.6 }}>
            管理者は AI 分析・メンバー権限変更が可能になります。
            自分自身の権限は変更できません（管理者が0人になるのを防ぐため）。
          </p>
        </div>

        {/* 招待セクション */}
        <div style={{
          background: 'rgba(20,22,32,0.75)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14,
          padding: '16px 18px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: KAI.text1, marginBottom: 2 }}>メンバーを招待</p>
              <p style={{ fontSize: 11, color: KAI.text4 }}>招待リンクを発行してシェア（有効期限48時間）</p>
            </div>
            <button
              onClick={() => { setInviteUrl(null); createInvite() }}
              disabled={inviting}
              style={{
                padding: '8px 14px', borderRadius: 9, border: `1px solid ${KAI.cyan}40`,
                background: `${KAI.cyan}10`, color: KAI.cyan, fontSize: 12, fontWeight: 600,
                cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <UserPlus size={13} strokeWidth={2}/>
              {inviting ? '作成中…' : 'リンク発行'}
            </button>
          </div>

          {inviteUrl && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 9, padding: '8px 12px',
              }}>
                <p style={{ fontSize: 11, color: KAI.text3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {inviteUrl}
                </p>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '4px 10px', borderRadius: 7, border: `1px solid ${copied ? KAI.success + '44' : 'rgba(255,255,255,0.12)'}`,
                    background: copied ? `${KAI.success}10` : 'rgba(255,255,255,0.06)',
                    color: copied ? KAI.success : KAI.text3, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  }}
                >
                  {copied ? <Check size={12}/> : <Copy size={12}/>}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
              <p style={{ fontSize: 10, color: KAI.text4, marginTop: 6, paddingLeft: 2 }}>
                このリンクを送ると相手がGoogleログイン後に参加できます
              </p>
            </div>
          )}
        </div>

        {/* メンバー一覧 */}
        {isLoading ? (
          <div style={{ ...panel, padding: '16px' }}>
            {[0, 1].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i === 0 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                <Skeleton variant="block" className="!h-9 !w-9 !rounded-[10px] shrink-0"/>
                <div style={{ flex: 1 }}>
                  <Skeleton variant="line-md" className="mb-1.5"/>
                  <Skeleton variant="line-sm"/>
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div style={{ ...panel, padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: KAI.danger }}>
              ⚠ 読み込みに失敗しました。管理者権限を確認してください。
            </p>
          </div>
        ) : (
          <div style={panel}>
            {members?.map((m, i) => (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px',
                borderBottom: i < (members.length - 1) ? '1px solid rgba(255,255,255,.05)' : 'none',
                opacity: pendingId === m.user_id ? 0.6 : 1,
                transition: 'opacity .2s',
              }}>
                {/* アバター */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: m.is_admin ? `${KAI.coral}18` : 'rgba(255,255,255,.05)',
                  border: `1px solid ${m.is_admin ? KAI.coral + '30' : 'rgba(255,255,255,.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  color: m.is_admin ? KAI.coral : KAI.text3,
                }}>
                  {m.display_name.charAt(0).toUpperCase()}
                </div>

                {/* 名前・メール */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: KAI.text1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.display_name}
                    </p>
                    {m.role === 'owner' && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${KAI.amber}18`, border: `1px solid ${KAI.amber}30`, color: KAI.amber, letterSpacing: '.04em', flexShrink: 0 }}>
                        OWNER
                      </span>
                    )}
                    {m.is_admin && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: `${KAI.coral}15`, border: `1px solid ${KAI.coral}28`, color: KAI.coral, letterSpacing: '.04em', flexShrink: 0 }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: KAI.text4, marginTop: 2, ...MONO }}>
                    {m.email}
                  </p>
                </div>

                {/* トグルボタン */}
                <button
                  onClick={() => mutate({ userId: m.user_id, isAdmin: !m.is_admin })}
                  disabled={isPending}
                  title={m.is_admin ? '管理者権限を外す' : '管理者権限を付与'}
                  style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                    border: `1px solid ${m.is_admin ? KAI.danger + '44' : KAI.success + '44'}`,
                    background: m.is_admin ? `${KAI.danger}0f` : `${KAI.success}0f`,
                    color: m.is_admin ? KAI.danger : KAI.success,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    transition: 'opacity .15s',
                  }}
                >
                  {m.is_admin
                    ? <ShieldOff size={15} strokeWidth={2}/>
                    : <ShieldCheck size={15} strokeWidth={2}/>
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: KAI.text4, marginTop: 16, paddingLeft: 4, lineHeight: 1.7 }}>
          最初の管理者はデータベースで直接 <code style={{ ...MONO, fontSize: 10, background: 'rgba(255,255,255,.06)', padding: '1px 5px', borderRadius: 4 }}>is_admin = true</code> に設定してください。
        </p>
      </div>
    </div>
  )
}
