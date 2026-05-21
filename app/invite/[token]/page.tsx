import { createClient } from '@/lib/supabase/server'
import AcceptPanel from './AcceptPanel'
import LoginToAccept from './LoginToAccept'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0c0a14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* 背景装飾 */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'rgba(167,139,250,0.05)', filter: 'blur(120px)' }}/>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 400, height: 400, borderRadius: '50%', background: 'rgba(34,211,238,0.04)', filter: 'blur(100px)' }}/>
      </div>

      {!user ? (
        <LoginToAccept token={token} />
      ) : (
        <AuthenticatedInviteView token={token} userId={user.id} />
      )}
    </div>
  )
}

async function AuthenticatedInviteView({ token, userId }: { token: string; userId: string }) {
  const supabase = await createClient()

  // 招待情報取得（SECURITY DEFINER function）
  const { data: rows } = await supabase.rpc('get_invite_info', { p_token: token })
  const info = rows?.[0] as { household_id: string; household_name: string; is_valid: boolean } | undefined

  if (!info) {
    return (
      <div style={{
        background: 'rgba(20,22,32,0.75)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        padding: '36px 32px', textAlign: 'center', maxWidth: 400, width: '100%',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>招待リンクが見つかりません</p>
        <p style={{ fontSize: 13, color: '#8b8ba0' }}>リンクが正しいか確認してください。</p>
      </div>
    )
  }

  // すでにこの世帯のメンバーかチェック
  const { data: existing } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', info.household_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return (
      <div style={{
        background: 'rgba(20,22,32,0.75)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
        padding: '36px 32px', textAlign: 'center', maxWidth: 400, width: '100%',
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>すでに参加しています</p>
        <p style={{ fontSize: 13, color: '#8b8ba0', marginBottom: 20 }}>「{info.household_name}」のメンバーです。</p>
        <a href="/" style={{
          display: 'inline-block', padding: '10px 24px', borderRadius: 10,
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#f0f0f5', fontSize: 13, textDecoration: 'none',
        }}>
          ダッシュボードへ
        </a>
      </div>
    )
  }

  return <AcceptPanel token={token} householdName={info.household_name} isValid={info.is_valid} />
}
