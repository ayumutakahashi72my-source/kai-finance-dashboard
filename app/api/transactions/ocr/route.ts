import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { extractReceiptText, structureReceiptText } from '@/lib/ocr'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  try {
    const body = await request.json() as { image?: string }
    if (!body.image) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 })
    }

    const base64 = body.image.replace(/^data:image\/\w+;base64,/, '')
    const buf = Buffer.from(base64, 'base64')

    const rawText = await extractReceiptText(buf)
    const result = await structureReceiptText(rawText, householdId, supabase)

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OCR処理に失敗しました'
    console.error('[OCR route]', err)
    return NextResponse.json({
      error: msg,
      payee: '',
      amount: 0,
      occurred_on: new Date().toISOString().split('T')[0],
      confidence: 0,
    })
  }
}
