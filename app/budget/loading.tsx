import { Sidebar } from '@/components/layout/Sidebar'
import { BottomBar } from '@/components/layout/BottomBar'
import { Skeleton } from '@/components/ui/Skeleton'

export default function BudgetLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--kai-bg-card)' }}>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 0, backgroundImage: `radial-gradient(ellipse 600px 400px at 60% 10%, rgba(251,191,36,.06), transparent 55%),radial-gradient(ellipse 500px 300px at 10% 80%, rgba(167,139,250,.06), transparent 55%)` }}/>
      <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: 1, backgroundImage: `linear-gradient(var(--kai-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--kai-grid-line) 1px,transparent 1px)`, backgroundSize: '40px 40px' }}/>
      <Sidebar/>
      <div className="relative min-h-screen lg:pl-[220px]" style={{ zIndex: 2 }}>
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-[14px]" style={{ background: 'var(--kai-header-bg)', backdropFilter: 'blur(24px)', borderBottom: `1px solid var(--kai-border2)` }}>
          <Skeleton variant="line-md" className="w-24"/>
          <Skeleton variant="avatar"/>
        </header>
        <main className="mx-auto max-w-2xl space-y-4 px-4 py-5 pb-32 lg:pb-10">
          <Skeleton variant="line-md" className="mx-auto w-48 h-9"/>
          <Skeleton variant="panel" className="h-32"/>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="panel" className="h-28"/>
            <Skeleton variant="panel" className="h-28"/>
          </div>
          <Skeleton variant="panel" className="h-48"/>
          <Skeleton variant="panel" className="h-36"/>
        </main>
      </div>
      <BottomBar/>
    </div>
  )
}
