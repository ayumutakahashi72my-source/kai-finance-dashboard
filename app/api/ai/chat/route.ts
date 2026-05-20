import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { FALLBACK } from '@/lib/fallback-messages'
import { trackCost } from '@/lib/cost-tracker'

const SYSTEM_PROMPT =
  'あなたは日本語で応答する家計簿アシスタントです。ユーザーが提供する家計データをもとに、節約アドバイスや支出分析を行ってください。回答は簡潔に200字以内を目安にしてください。'

async function getHouseholdId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .limit(1)
    .single()
  return data?.household_id ?? null
}

// 直近3ヶ月の圧縮コンテキスト（約8,000トークン以内）
async function buildChatContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  householdId: string
): Promise<string> {
  const now = new Date()
  const months: string[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
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

// Sonnet input/output トークンコストを円換算（$3/$15 per MTok × ¥150/USD）
function estimateCostYen(inputTokens: number, outputTokens: number): number {
  return Math.ceil((inputTokens * 3 + outputTokens * 15) / 1_000_000 * 150)
}

async function getOrCreateSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI機能が設定されていません' }, { status: 503 })
  }

  const body = await req.json() as { message?: string }
  const userMessage = body.message?.trim()
  if (!userMessage) return NextResponse.json({ error: 'メッセージが空です' }, { status: 400 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const session = await getOrCreateSession(supabase, householdId, year, month)
  if (!session) return NextResponse.json({ error: 'セッション作成失敗' }, { status: 500 })

  // 送信前チェック（OR条件）
  if (session.session_count >= 20 || session.estimated_cost >= 2000) {
    return NextResponse.json({ error: 'limit_exceeded' }, { status: 429 })
  }

  // 直近6ターン（12件）の履歴
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('household_id', householdId)
    .eq('year', year)
    .eq('month', month)
    .order('created_at', { ascending: false })
    .limit(12)

  const pastMessages = (history ?? []).reverse()

  // 現在のuserメッセージにコンテキストをインジェクション
  const context = await buildChatContext(supabase, householdId)
  const userContent = `${context}\n\n${userMessage}`

  const messages: Anthropic.MessageParam[] = [
    ...pastMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userContent },
  ]

  let response
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    })
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : '不明なエラー'
    console.error('[ai/chat] Anthropic error:', error_msg)
    void supabase.from('api_error_logs').insert({
      household_id: householdId,
      feature: 'ai_chat',
      error_msg,
    })
    return NextResponse.json({ error: FALLBACK.chat }, { status: 500 })
  }

  const assistantContent = response.content[0].type === 'text' ? response.content[0].text : ''
  const callCost = estimateCostYen(response.usage.input_tokens, response.usage.output_tokens)

  void trackCost({
    household_id: householdId,
    model: 'claude-sonnet-4-6',
    feature: 'chat',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }, supabase)

  // メッセージ保存（userは元のメッセージ、contextはインジェクションのみで保存しない）
  await supabase.from('chat_messages').insert([
    { household_id: householdId, year, month, role: 'user', content: userMessage },
    { household_id: householdId, year, month, role: 'assistant', content: assistantContent },
  ])

  // セッションカウント＋コスト更新
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
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const householdId = await getHouseholdId(supabase, user.id)
  if (!householdId) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

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
