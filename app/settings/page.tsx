import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { MfSettingsForm } from '@/components/settings/MfSettingsForm'
import { MfSyncLogs } from '@/components/settings/MfSyncLogs'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: household } = await supabase
    .from('households')
    .select('id, settings')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (!household) redirect('/')

  const settings = household.settings as { mf_email?: string; mf_password?: string } | null

  return (
    <div className="min-h-screen bg-[#0a0a10] px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#5eead4]/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl space-y-4">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="bg-gradient-to-r from-[#5eead4] to-[#22d3ee] bg-clip-text font-mono text-2xl font-bold tracking-tight text-transparent"
          >
            KAI
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-[#8b8ba0] transition-colors hover:text-[#f0f0f5]"
          >
            <ChevronLeft className="size-4" />
            ダッシュボード
          </Link>
        </header>

        <h1 className="text-lg font-semibold text-[#f0f0f5]">設定</h1>

        <div className="rounded-[18px] border border-white/10 bg-[rgba(20,22,32,0.66)] p-6 backdrop-blur-[24px]">
          <MfSettingsForm
            initialEmail={settings?.mf_email ?? null}
            initialEnabled={!!(settings?.mf_email && settings?.mf_password)}
          />
        </div>

        {/* 監査ログ */}
        <div className="rounded-[18px] border border-white/10 bg-[rgba(20,22,32,0.66)] p-6 backdrop-blur-[24px]">
          <p className="mb-4 text-sm font-medium text-[#f0f0f5]">取り込みログ</p>
          <MfSyncLogs />
        </div>
      </div>
    </div>
  )
}
