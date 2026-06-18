import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import Papa from 'papaparse'

function csvSafe(v: unknown): string {
  const s = String(v ?? '')
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
}

function sanitizeFilenameSegment(s: string): string {
  return s.replace(/[^A-Za-z0-9._-]/g, '')
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  const params = req.nextUrl.searchParams
  const month = params.get('month')
  const q = params.get('q')?.trim()
  const cat = params.get('cat')
  const from = params.get('from')
  const to = params.get('to')

  const monthOk = month && /^\d{4}-\d{2}$/.test(month) ? month : null

  let query = supabase
    .from('transactions')
    .select('*, categories(name)')
    .eq('household_id', householdId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte('occurred_on', from)
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte('occurred_on', to)
  if (!from && !to && monthOk) {
    const [y, m] = monthOk.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    query = query
      .gte('occurred_on', `${monthOk}-01`)
      .lte('occurred_on', `${monthOk}-${String(lastDay).padStart(2, '0')}`)
  }

  if (q) query = query.ilike('payee', `%${q}%`)
  if (cat) {
    const ids = cat.split(',').filter((s) => /^[0-9a-f-]{36}$/i.test(s))
    if (ids.length) query = query.in('category_id', ids)
  }

  const { data, error } = await query
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const rows = (data ?? []).map((tx) => ({
    日付: csvSafe(tx.occurred_on),
    支払先: csvSafe(tx.payee),
    カテゴリ: csvSafe((tx.categories as { name: string } | null)?.name ?? ''),
    金額: Math.abs(tx.amount),
    種別: tx.amount >= 0 ? '収入' : '支出',
    ソース: csvSafe(tx.source ?? ''),
  }))

  const csv = Papa.unparse(rows, {
    columns: ['日付', '支払先', 'カテゴリ', '金額', '種別', 'ソース'],
  })

  const filename = monthOk
    ? `kai_transactions_${sanitizeFilenameSegment(monthOk)}.csv`
    : from && to
      ? `kai_transactions_${sanitizeFilenameSegment(from)}_${sanitizeFilenameSegment(to)}.csv`
      : 'kai_transactions.csv'

  return new Response('﻿' + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
