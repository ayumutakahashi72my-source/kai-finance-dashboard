import { redirect } from 'next/navigation'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const params = new URLSearchParams({ tab: '1' })
  if (month) params.set('month', month)
  redirect(`/analytics?${params}`)
}
