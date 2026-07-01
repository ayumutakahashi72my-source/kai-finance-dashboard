import { describe, it, expect, vi, afterEach } from 'vitest'
import { upsertCategoryRag } from '@/lib/ai-classifier'

const HOUSEHOLD_ID = 'household-1'

const ROWS = [
  {
    household_id: HOUSEHOLD_ID,
    payee_key: 'sevenEleven',
    category_id: 'cat-1',
    confidence: 0.9,
    embedding: null,
    hit_count: 4,
    last_seen: '2026-07-01',
  },
]

describe('upsertCategoryRag (R-3/R-7 ルーティング)', () => {
  const originalFlag = process.env.ENABLE_RAG_GREATEST_UPSERT

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.ENABLE_RAG_GREATEST_UPSERT
    else process.env.ENABLE_RAG_GREATEST_UPSERT = originalFlag
  })

  it('デフォルトでは category_rag_upsert_batch RPC を household_id と rows で呼ぶ', async () => {
    delete process.env.ENABLE_RAG_GREATEST_UPSERT
    const rpc = vi.fn(async () => ({ error: null }))
    const supabase = { rpc } as unknown as Parameters<typeof upsertCategoryRag>[0]

    await upsertCategoryRag(supabase, HOUSEHOLD_ID, ROWS)

    expect(rpc).toHaveBeenCalledWith('category_rag_upsert_batch', {
      p_household_id: HOUSEHOLD_ID,
      p_rows: ROWS,
    })
  })

  it('ENABLE_RAG_GREATEST_UPSERT=false のとき旧実装(直接upsert)にフォールバックする', async () => {
    process.env.ENABLE_RAG_GREATEST_UPSERT = 'false'
    const rpc = vi.fn()
    const upsert = vi.fn(async () => ({ error: null }))
    const supabase = {
      rpc,
      from: () => ({ upsert }),
    } as unknown as Parameters<typeof upsertCategoryRag>[0]

    await upsertCategoryRag(supabase, HOUSEHOLD_ID, ROWS)

    expect(rpc).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith(ROWS, { onConflict: 'household_id,payee_key' })
  })

  it('空配列の場合は何も呼ばない', async () => {
    const rpc = vi.fn()
    const supabase = { rpc } as unknown as Parameters<typeof upsertCategoryRag>[0]

    await upsertCategoryRag(supabase, HOUSEHOLD_ID, [])

    expect(rpc).not.toHaveBeenCalled()
  })
})
