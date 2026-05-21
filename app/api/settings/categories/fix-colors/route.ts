import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { pickCategoryColor, fetchCategoryIcons } from '@/lib/ai-classifier'

// 色・アイコンが未設定のカテゴリに一括で付与する
export async function POST() {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, color, icon')
    .eq('household_id', householdId)

  if (!cats?.length) return NextResponse.json({ updated: 0 })

  const noIcon  = cats.filter((c) => !c.icon).map((c) => c.name)
  const iconMap = noIcon.length ? await fetchCategoryIcons(noIcon) : new Map<string, string>()

  let updated = 0
  for (const cat of cats) {
    const newColor = cat.color ?? pickCategoryColor(cat.name)
    const newIcon  = cat.icon  ?? iconMap.get(cat.name) ?? null
    if (newColor === cat.color && newIcon === cat.icon) continue

    await supabase
      .from('categories')
      .update({ color: newColor, icon: newIcon })
      .eq('id', cat.id)
    updated++
  }

  return NextResponse.json({ updated })
}
