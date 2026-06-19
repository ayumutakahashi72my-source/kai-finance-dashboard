import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function CalendarLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--kai-bg-card)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 600px 400px at 50% 20%, rgba(167,139,250,.07), transparent 55%)` }}/>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(var(--kai-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--kai-grid-line) 1px,transparent 1px)`, backgroundSize: '40px 40px' }}/>
      <Sidebar/>
      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]" style={{ background: 'var(--kai-header-bg)', backdropFilter: 'blur(24px)', borderBottom: `1px solid var(--kai-border2)` }}>
          <Skeleton variant="line-md" className="w-28"/>
          <Skeleton variant="avatar"/>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-5 pb-32 lg:pb-10">
          {/* 月切り替え */}
          <Skeleton variant="line-md" className="mx-auto mb-5 w-48 h-9"/>
          {/* カレンダーグリッド */}
          <Skeleton variant="panel" className="h-72 mb-4"/>
          {/* 取引リスト */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="panel" className="h-14"/>
            ))}
          </div>
        </main>
      </div>
      <BottomBar/>
    </div>
  )
}
