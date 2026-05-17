import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { CategoryList } from '@/components/categories/CategoryList'
import { getCategories } from '@/app/actions/categories'

export default async function CategoriesSettingsPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const categories = await getCategories()

  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 0,
          backgroundImage: `radial-gradient(ellipse 600px 400px at 80% 20%, rgba(167,139,250,.10), transparent 55%),radial-gradient(ellipse 500px 300px at 20% 80%, rgba(94,234,212,.06), transparent 55%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          zIndex: 1,
          backgroundImage: `linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <Sidebar />

      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header
          className="sticky top-0 z-30 flex items-center gap-3 px-4 py-[14px]"
          style={{
            background: 'rgba(8,8,14,.55)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <Link
            href="/settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] transition-colors hover:bg-white/[0.07]"
            style={{ color: '#8b8ba0' }}
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <h1 className="text-[16px] font-semibold" style={{ color: '#f0f0f5' }}>
            カテゴリ管理
          </h1>
        </header>

        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 lg:pb-10">
          <div
            className="rounded-[18px] p-5"
            style={{
              background: 'rgba(20,22,32,0.75)',
              backdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <CategoryList initial={categories} />
          </div>
        </main>
      </div>

      <BottomBar />
    </div>
  )
}
