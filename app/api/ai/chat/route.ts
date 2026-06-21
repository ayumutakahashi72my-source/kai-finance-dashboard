import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { jstNow } from '@/lib/jst'
import Anthropic from '@anthropic-ai/sdk'
import { FALLBACK } from '@/lib/fallback-messages'
import { trackCost, estimateCostUsd, costUsdToYen } from '@/lib/cost-tracker'
import { getEnvKey } from '@/lib/api-keys'
import { embedText } from '@/lib/embedder'
import type { SupabaseClient } from '@supabase/supabase-js'

const SYSTEM_PROMPT =
  'あなたは日本語で応答する家計簿アシスタントです。ユーザーが提供する家計データをもとに、節約アドバイスや支出分析を行ってください。回答は簡潔に200字以内を目安にしてください。絵文字は使用せず、プレーンテキストとMarkdownのみで記述してください。'

async function buildChatContext(
  supabase: SupabaseClient,
  householdId: string
): Promise<string> {
  const now = jstNow()
  const months: string[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }

  const { data: rows } = await supabase
    .from('transactions')
    .select('amount, payee, occurred_on, categories(name)')
    .eq('household_id', householdId)
    .gte('occurred_on', `${months[0]}-01`)
    .lte('occurred_on', `${months[2]}-31`)

  const catMap = new Map<string, number>()
  const payeeMap = new Map<string, { count: number; total: number }>()

  for (const r of rows ?? []) {
    if (r.amount >= 0) continue
    const abs = Math.abs(r.amount)
    const cat = r.categories as unknown as { name: string } | null
    const name = cat?.name ?? 'その他'
    catMap.set(name, (catMap.get(name) ?? 0) + abs)
    const p = payeeMap.get(r.payee) ?? { count: 0, total: 0 }
    payeeMap.set(r.payee, { count: p.count + 1, total: p.total + abs })
  }

  const catLines = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => `${name}: ¥${total.toLocaleString()}`)
    .join(', ')

  const top10 = [...payeeMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([payee, v]) => `${payee}(${v.count}回/¥${v.total.toLocaleString()})`)
    .join(', ')

  return `[直近3ヶ月（${months[0]}〜${months[2]}）の家計データ]\nカテゴリ別支出: ${catLines || 'なし'}\n上位店舗Top10: ${top10 || 'なし'}`
}

async function getOrCreateSession(
  supabase: SupabaseClient,
  householdId: string,
  year: number,
  month: number
) {
  const { data } = await supabase
    .from('chat_sessions')
    .select('id, session_count, estimated_cost')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (data) return data

  const { data: created } = await supabase
    .from('chat_sessions')
    .insert({ household_id: householdId, year, month })
    .select('id, session_count, estimated_cost')
    .single()
  return created
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'リクエスト本文が不正です' }, { status: 400 })
  }

  const userMessage = (body as { message?: string }).message?.trim()
  if (!userMessage) return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 })

  const now = jstNow()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const session = await getOrCreateSession(supabase, householdId, year, month)
  if (!session) return NextResponse.json({ error: 'セッション作成失敗' }, { status: 500 })

  if (session.session_count >= 20 || session.estimated_cost >= 2000) {
    return NextResponse.json({ error: 'limit_exceeded' }, { status: 429 })
  }

  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: false })
    .limit(12)

  const pastMessages = (history ?? []).reverse()
  while (pastMessages.length > 0 && pastMessages[0].role !== 'user') {
    pastMessages.shift()
  }

  let memoryContext = ''
  if (process.env.VOYAGE_API_KEY) {
    try {
      const qEmbedding = await embedText(userMessage)
      const { data: similar } = await supabase.rpc('search_insights', {
        p_household_id: householdId,
        p_embedding: qEmbedding,
        p_limit: 3,
      })
      if (similar?.length) {
        const lines = (similar as Array<{ question: string; answer: string; similarity: number }>)
          .map((r) => `Q: ${r.question}\nA: ${r.answer}`)
          .join('\n---\n')
        memoryContext = `\n\n[過去の関連Q&A]\n${lines}`
      }
    } catch { /* Voyage API 失敗は無視 */ }
  }

  const context = await buildChatContext(supabase, householdId)
  const userContent = `${context}${memoryContext}\n\n${userMessage}`

  const MODEL = 'claude-sonnet-4-6'
  const messages: Anthropic.MessageParam[] = [
    ...pastMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userContent },
  ]

  let response
  try {
    const client = new Anthropic({ apiKey: getEnvKey('ANTHROPIC_API_KEY') })
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    })
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/chat] Anthropic error:', error_msg)
    void supabase.from('api_error_logs').insert({
      household_id: householdId,
      feature: 'ai_chat',
      error_msg,
    })
    return NextResponse.json({ error: FALLBACK.chat }, { status: 500 })
  }

  const assistantContent = response.content[0].type === 'text' ? response.content[0].text : ''
  const callCost = costUsdToYen(estimateCostUsd(MODEL, response.usage.input_tokens, response.usage.output_tokens))

  void trackCost({
    household_id: householdId,
    model: MODEL,
    feature: 'chat',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }, supabase)

  await supabase.from('chat_messages').insert([
    { household_id: householdId, year, month, role: 'user', content: userMessage },
    { household_id: householdId, year, month, role: 'assistant', content: assistantContent },
  ])

  if (process.env.VOYAGE_API_KEY) {
    void (async () => {
      try {
        const embedding = await embedText(userMessage)
        await supabase.from('ai_insights_embeddings').insert({
          household_id: householdId,
          question: userMessage,
          answer: assistantContent,
          embedding,
        })
      } catch { /* 保存失敗はサイレントに無視 */ }
    })()
  }

  await supabase
    .from('chat_sessions')
    .update({
      session_count: session.session_count + 1,
      estimated_cost: session.estimated_cost + callCost,
    })
    .eq('id', session.id)

  return NextResponse.json({
    message: assistantContent,
    usage: {
      session_count: session.session_count + 1,
      estimated_cost: session.estimated_cost + callCost,
    },
  })
}

// GET: チャット履歴と使用量を返す
// ?history=true → 過去のセッション一覧
// ?year=YYYY&month=MM → 指定月の履歴
// (パラメータなし) → 今月の履歴
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { supabase, householdId } = auth
  const { searchParams } = new URL(req.url)

  if (searchParams.get('history') === 'true') {
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('year, month, session_count, estimated_cost')
      .eq('household_id', householdId)
      .gt('session_count', 0)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12)
    return NextResponse.json({ sessions: sessions ?? [] })
  }

  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  const now = jstNow()
  const year = yearParam ? parseInt(yearParam, 10) : now.getUTCFullYear()
  const month = monthParam ? parseInt(monthParam, 10) : (now.getUTCMonth() + 1)

  const [{ data: messages }, { data: session }] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month)
      .order('created_at', { ascending: true }),
    supabase
      .from('chat_sessions')
      .select('session_count, estimated_cost')
      .eq('household_id', householdId)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle(),
  ])

  return NextResponse.json({
    messages: messages ?? [],
    usage: session ?? { session_count: 0, estimated_cost: 0 },
  })
}
