import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'

// GET /api/transactions?month=2026-05
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const params = req.nextUrl.searchParams
  const month  = params.get('month')
  const q      = params.get('q')?.trim()
  const cat    = params.get('cat')
  const from   = params.get('from')
  const to     = params.get('to')
  const min    = params.get('min')
  const max    = params.get('max')

  let query = supabase
    .from('transactions')
    .select('*, categories(name, color, icon, parent_id, parent:parent_id(name, color))')
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  // 日付範囲: from/to 指定があれば優先、無ければ month を使う
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte('occurred_on', from)
  if (to   && /^\d{4}-\d{2}-\d{2}$/.test(to))   query = query.lte('occurred_on', to)
  if (!from && !to && month) {
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    query = query.gte('occurred_on', `${month}-01`).lte('occurred_on', `${month}-${String(lastDay).padStart(2, '0')}`)
  } else if (!from && !to && !month) {
    query = query.limit(100)
  }

  // payee 部分一致（ILIKE）— ワイルドカード文字をエスケープ
  if (q) {
    const escaped = q.replace(/%/g, '\\%').replace(/_/g, '\\_')
    query = query.ilike('payee', `%${escaped}%`)
  }

  // カテゴリ ID（複数カンマ区切り）
  if (cat) {
    const ids = cat.split(',').filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    if (ids.length) query = query.in('category_id', ids)
  }

  // 金額範囲（絶対値）
  const minN = min ? parseInt(min, 10) : NaN
  const maxN = max ? parseInt(max, 10) : NaN
  // amount は支出が負・収入が正なので絶対値範囲は両方向確認が要る → JS側で再フィルタ
  // ただしまず SQL で広く取って後段で絞る形にする（インデックスがないため）

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rows = data ?? []
  if (!isNaN(minN)) rows = rows.filter((r) => Math.abs(r.amount) >= minN)
  if (!isNaN(maxN)) rows = rows.filter((r) => Math.abs(r.amount) <= maxN)

  return NextResponse.json({ data: rows })
}
