import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { TransactionList } from '@/components/transactions/TransactionList'
import { getTransactions } from '@/app/actions/transactions'
import type { Transaction } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) redirect('/login')

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'ユーザー'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const transactions = (await getTransactions()) as Transaction[]

  return (
    <div className="min-h-screen bg-[#0a0a10] px-4 py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#5eead4]/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <span className="bg-gradient-to-r from-[#5eead4] to-[#22d3ee] bg-clip-text font-mono text-2xl font-bold tracking-tight text-transparent">
            KAI
          </span>
          <LogoutButton />
        </header>

        <div className="rounded-[18px] border border-white/10 bg-[rgba(20,22,32,0.66)] p-8 backdrop-blur-[24px]">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full ring-2 ring-[#5eead4]/30"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#5eead4]/20 text-lg font-bold text-[#5eead4]">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-[#f0f0f5]">{displayName}</p>
              <p className="text-sm text-[#8b8ba0]">{user.email}</p>
            </div>
          </div>
        </div>

        <TransactionList initial={transactions} />
      </div>
    </div>
  )
}
