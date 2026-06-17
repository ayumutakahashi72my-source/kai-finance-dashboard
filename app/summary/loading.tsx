import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function SummaryLoading() {
  return (
    <div className="min-h-screen" style={{ background: '#0c0a14' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 700px 500px at 80% 8%, rgba(251,148,119,.09), transparent 55%),radial-gradient(ellipse 600px 400px at 12% 78%, rgba(167,139,250,.06), transparent 55%)` }}/>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`, backgroundSize: '40px 40px' }}/>
      <Sidebar/>
      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]" style={{ background: 'rgba(8,8,14,.55)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <Skeleton variant="line-md" className="w-32"/>
          <Skeleton variant="avatar"/>
        </header>
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-32 lg:pb-10">
          {/* チャットパネル */}
          <Skeleton variant="panel" className="h-[420px]"/>
          {/* 月次サマリー */}
          <Skeleton variant="panel" className="h-12"/>
        </main>
      </div>
      <BottomBar/>
    </div>
  )
}
