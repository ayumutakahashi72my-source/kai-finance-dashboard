import { redirect } from 'next/navigation'
import { jstMonthStr } from '@/lib/jst'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const m = month ?? jstMonthStr()
  redirect(`/transactions?month=${m}&view=calendar`)
}
