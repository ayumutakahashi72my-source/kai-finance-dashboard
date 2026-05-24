# OCR Pipeline Architecture Review

Generated: 2026-05-24

---

## Data Flow

```
[Camera / File Input]
  └─ canvas preprocessing (grayscale, contrast+1.4, brightness+1.1, max 1600×2800, 82% JPEG)
      └─ POST /api/transactions/ocr (FormData)
          └─ requireAuth() → householdId
              └─ extractReceiptBlocks()  [ONNX PP-OCRv5]
                  └─ structureReceiptData()  [pipeline.ts]
                      ├─ 1. heuristic extraction (merchant / amount / date)
                      ├─ 2. store cache lookup  (ocr_store_cache table)
                      ├─ 3. embedding fallback  (STUBBED — returns null)
                      └─ 4. AI fallback         (Claude Haiku, <5s, 2 retries)
                          └─ OcrResult { payee, amount, occurred_on, confidence }
```

---

## Three RAG Layers

### Layer 1: Heuristic Rules
- **Merchant**: Top-10 blocks scored by OCR confidence + position + width + centering + proximity to TEL/ZIP markers. Canonical chain resolution via `chains.json` (42 retailers).
- **Amount**: ¥-prefixed values, full/half-width numerals. Priority: 合計 > 小計 > fallback. Refund detection in first 5 lines + total vicinity only.
- **Date**: Gregorian + Japanese era (令和N年M月D日). Valid range 2020–2035; fallback to today (JST).

### Layer 2: Store Cache
- Fingerprint = `hash(normalized_merchant + phone_suffix + zipcode)`, key = first 16 chars
- **Hit threshold**: confidence ≥ 0.80 → immediate return
- **Write threshold**: confidence ≥ 0.82 AND (merchant ≥3 chars OR phone/zipcode present)
- Atomic upsert via PostgreSQL RPC `ocr_cache_upsert()` (prevents race conditions)
- **Migration dependency**: `20260522000030_ocr_store_cache.sql` must be applied to Supabase before cache writes function

### Layer 3: AI Fallback (Claude Haiku)
- Trigger: merchantConfidence < 0.65 OR amountConfidence < 0.60 OR dateConfidence < 0.50
- Input: ≤20 key lines (top-5 + markers + last-10), no item descriptions
- Output: Zod-validated JSON `{ payee, amount, occurred_on, confidence, canonical_chain? }`
- Timeout: 5 seconds, 2 retries (timeout/429 excluded from retry)

---

## Error Handling Gaps

| # | Location | Issue | Risk | Fix |
|---|---|---|---|---|
| 1 | `cache.ts` | `.single()` throws on zero rows (expected case) | Medium | Use `.maybeSingle()` |
| 2 | `blocks.ts` | ONNX model absence detected lazily on first request | Medium | Startup health-check |
| 3 | `ai-fallback.ts` | Missing `ANTHROPIC_API_KEY` silently degrades; no log | Low | Add `console.warn` |
| 4 | `ReceiptAnalyzingV2.tsx` | `canvas.toBlob()` failure rejects without fallback | Low | Catch → use original blob |
| 5 | `blocks.ts` | Inference lock has no timeout; hung request blocks queue indefinitely | Low | Add `Promise.race` timeout |
| 6 | `cache.ts` | Cache-write RPC silently fails if migration unapplied | Low | Document; migration is known pending |

---

## Performance Profile

| Operation | Time | Notes |
|---|---|---|
| ONNX model load | ~800ms (1st only) | Singleton cached in globalThis |
| Sharp resize + filters | ~150–300ms | CPU-bound |
| ONNX inference | ~400–800ms | Serialized by mutex (1 at a time) |
| Cache lookup | <100ms | Supabase query |
| AI fallback | 1–3s | Only triggered on low confidence |
| **Total (no AI)** | **~1.2–1.5s** | ✓ Well within 45s route limit |
| **Total (with AI)** | **~2.5–4.5s** | ✓ Acceptable |

**No N+1 patterns found.** No database queries inside block loops.

---

## Memory Concerns

- ONNX models: ~130MB combined (det + rec), cached in `globalThis` across requests
- Sharp pipeline: Peak ~120MB intermediate buffers at 2800px height (7-step chain)
- Vercel Pro+ tier recommended; Hobby tier's 1GB function memory may be tight under concurrent OCR

---

## Type Safety

All interfaces are properly typed end-to-end (`OcrResult`, `OCRBlock`, `MerchantResult`, `AmountResult`, `DateResult`, `FingerprintResult`). AI response parsed with `safeParse()` (Zod). No `any` types in pipeline.

**Minor gap**: OCR route error response does not include required `OcrResult` fields when failing, so client must null-check.

---

## Duplicate Logic

- Merchant normalization exists in two places: `lib/ocr/normalize.ts` (NFKC + half-width + typo map) and `lib/ai-classifier.ts` (NFKC + lowercase + suffix removal). Different algorithms — cache key generation may diverge if same merchant flows through both paths.
- No practical risk today (layers are sequential), but fragile if pipeline changes.

---

## Immediate Fixes (Safe)

### Fix 1: `.single()` → `.maybeSingle()` in cache.ts
```typescript
// Before
const { data, error } = await supabase.from('ocr_store_cache').select(...).single()
// After  
const { data, error } = await supabase.from('ocr_store_cache').select(...).maybeSingle()
```

### Fix 2: Log warning on missing API key in ai-fallback.ts
```typescript
if (!apiKey) {
  console.warn('[ocr] ANTHROPIC_API_KEY not set — AI fallback disabled')
  return null
}
```

---

## Strengths

- Layered fallback design with clear confidence thresholds is elegant
- Atomic RPC upsert prevents cache corruption under concurrent writes
- Fire-and-forget cache hit increments don't block response latency
- Comprehensive typo map (AE0N→AEON, ＳＥＶＥＮ→セブン, etc.)
- Refund detection scoped to avoid false positives from item prices
- `logOcrMetrics()` enables production observability
- Zod validation on AI response prevents silent JSON coercion
