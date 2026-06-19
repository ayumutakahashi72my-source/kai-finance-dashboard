import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-guard'
import { extractReceiptBlocks, structureReceiptData } from '@/lib/ocr'

export const maxDuration = 45

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, householdId } = auth

  try {
    const form = await request.formData()
    const raw = form.get('file')
    if (!raw || !(raw instanceof File)) {
      return NextResponse.json({ error: '画像が必要です' }, { status: 400 })
    }
    const file = raw

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: `未対応の画像形式です: ${file.type}` }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ファイルサイズが10MBを超えています' }, { status: 400 })
    }

    const t_ocr0 = Date.now()
    const buf = Buffer.from(await file.arrayBuffer())
    const rawBlocks = await extractReceiptBlocks(buf)
    const ocr_ms = Date.now() - t_ocr0

    const { timings, ...result } = await structureReceiptData({ blocks: rawBlocks, householdId, supabase })

    console.log('[OCR] timings', { ...timings, ocr_ms, total_ms: timings.total_ms + ocr_ms })

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
    }, { status: 500 })
  }
}
