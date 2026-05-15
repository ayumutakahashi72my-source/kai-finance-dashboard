import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignInWithGoogle from './SignInWithGoogle'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/')

  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a10] px-4">
      {/* 背景装飾 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#5eead4]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[#a78bfa]/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* ロゴ */}
        <div className="mb-10 text-center">
          <span className="bg-gradient-to-r from-[#5eead4] to-[#22d3ee] bg-clip-text font-mono text-4xl font-bold tracking-tight text-transparent">
            KAI
          </span>
          <p className="mt-2 text-sm text-[#8b8ba0]">家計簿管理システム</p>
        </div>

        {/* カード */}
        <div className="rounded-[18px] border border-white/10 bg-[rgba(20,22,32,0.66)] p-8 shadow-2xl backdrop-blur-[24px]">
          <h1 className="mb-1 text-lg font-semibold text-[#f0f0f5]">ログイン</h1>
          <p className="mb-8 text-sm text-[#8b8ba0]">
            Googleアカウントでサインインしてください
          </p>

          {error === 'auth_failed' && (
            <div className="mb-6 rounded-lg border border-[#fb7185]/30 bg-[#fb7185]/10 px-4 py-3 text-sm text-[#fb7185]">
              認証に失敗しました。もう一度お試しください。
            </div>
          )}

          <SignInWithGoogle />
        </div>

        <p className="mt-6 text-center text-xs text-[#5e5e72]">
          招待されたメンバーのみアクセスできます
        </p>
      </div>
    </div>
  )
}
