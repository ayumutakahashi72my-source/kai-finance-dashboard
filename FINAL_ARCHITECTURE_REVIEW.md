# Final Architecture Review

Generated: 2026-05-24  
Phase: 2 / Week 12

---

## What Was Done This Session

| Phase | Changes | Status |
|---|---|---|
| Phase 1 | ESLint: 41 warnings → 0 | ✅ Committed |
| Phase 2A | `proxy.ts` → `middleware.ts` (auth redirect was silently broken) | ✅ Committed |
| Phase 2B | `/settings/mf` redirect → `/settings/integrations/mf`; delete duplicate page | ✅ Committed |
| Phase 2C | TransactionFilters: 6 cascading `useState` → 1 object | ✅ Committed |
| Phase 3A | DashboardTabs: 794 lines → 68 lines (NowTab, AnalyticsTab, dashboard-utils extracted) | ✅ Committed |
| Phase 3B | AddPickerSheet: 1189 lines → 148 lines (tabs/ directory, _shared.tsx) | ✅ Committed |
| Phase 4 | `components/kai` removed from `tsconfig.json` exclude; 1 type error fixed | ✅ Committed |
| Phase 5 | ESLint: 21 warnings → 0 (unused vars, static-components, set-state-in-effect, no-img-element) | ✅ Committed |

**Critical bug fixed**: `middleware.ts` rename. `proxy.ts` was never executed by Next.js — auth redirects for unauthenticated users were silently broken.

---

## Current State

```
ESLint:     0 warnings, 0 errors
TypeScript: 0 errors (all files including components/kai now type-checked)
Tests:      see docs/test-policy.md for when to run
```

---

## Architecture Strengths

**Responsibility separation is clear:**
- API Routes: all business logic
- Supabase: DB + Auth only (no service_role_key in frontend)
- TanStack Query: server state cache
- URL params: month + filter state
- useState: modal open/close

**OCR pipeline**: Layered fallback design (rules → store cache → Haiku) with clear confidence thresholds. Atomic cache upsert prevents race conditions. Well-typed end-to-end.

**Auth**: `requireAuth()` centralized, always first in handler. RLS as second defense layer.

**PWA**: Manifest complete, installable on iOS and Android. Hydration is clean — no mismatches detected.

---

## Known Technical Debt (Documented, Not Blocking)

### High Priority

| # | Issue | File | Fix |
|---|---|---|---|
| 1 | `cache.ts` `.single()` throws on expected empty result | `lib/ocr/cache.ts` | Use `.maybeSingle()` |
| 2 | Inline style objects in NowTab (82 instances) cause unnecessary re-renders | `components/dashboard/NowTab.tsx` | Extract to module-level `const S` |
| 3 | No `useMemo` for donut arc geometry | `components/dashboard/NowTab.tsx` | Wrap in `useMemo([segments, total])` |

### Medium Priority

| # | Issue | File | Fix |
|---|---|---|---|
| 4 | 4 API routes duplicate `requireAuth()` pattern inline | `categories`, `transactions`, `fixed-expenses`, `transactions/classify` | Migrate to `requireAuth()` |
| 5 | Missing `useMemo` for category totals | `BudgetDashboard.tsx` | `useMemo([categories, budget])` |
| 6 | Recharts statically imported | `NowTab.tsx`, `AnalyticsTab.tsx` | `dynamic(() => import(...), { ssr: false })` |
| 7 | `ai-fallback.ts` silent degradation on missing API key | `lib/ocr/ai-fallback.ts` | Add `console.warn` |

### Low Priority

| # | Issue | File | Fix |
|---|---|---|---|
| 8 | No `useCallback` on handlers in TransactionList | `TransactionList.tsx` | Add to 3–4 handlers |
| 9 | Legal pages re-render on every request | `app/legal/*/page.tsx` | Add `export const revalidate = 3600` |
| 10 | No page-level `loading.tsx` | `app/budget/`, `app/(dashboard)/` | Optional UX improvement |
| 11 | `BudgetSuggestCard.tsx` marked `'use client'` unnecessarily | `components/budget/` | Remove directive |
| 12 | `app/settings/corrections/page.tsx` marked `'use client'` unnecessarily | `app/settings/corrections/` | Remove directive |
| 13 | OCR cache migration pending | Supabase dashboard | Run `20260522000030_ocr_store_cache.sql` |

---

## What NOT to Change

Per project constraints (CLAUDE.md + REFACTOR_PLAN.md):

- ❌ DB schema (migrations)
- ❌ Auth flow
- ❌ OCR core algorithm
- ❌ RAG search logic
- ❌ Design tokens / styles
- ❌ Service Worker cache keys
- ❌ `service_role_key` in any client or API Route
- ❌ MoneyForward test state

---

## Recommended Next Steps (Week 13+)

**Immediate** (safe, <1 hour total):
1. Fix `cache.ts` `.single()` → `.maybeSingle()` (1 line)
2. Add `console.warn` in `ai-fallback.ts` for missing API key (3 lines)
3. Remove `'use client'` from `BudgetSuggestCard.tsx` and `corrections/page.tsx`

**Week 13 Feature Work** (from CLAUDE.md):
- `components/budget/FixedExpenseCard.tsx` — fixed_expense_suggestions UI
- `app/settings/goals/page.tsx` — form UX improvements
- `app/budget/page.tsx` — FixedExpenseCard integration

**Background / Can Wait**:
- Extract NowTab style constants (do alongside feature work to avoid merge conflicts)
- `requireAuth()` migration for 4 routes (low risk, do in one PR)
- Recharts dynamic import (do when bundle size becomes a concern)

---

## Report Index

| Report | Topic |
|---|---|
| `CLIENT_COMPONENT_AUDIT.md` | Which `'use client'` components can be converted |
| `OCR_ARCHITECTURE_REVIEW.md` | OCR pipeline data flow, gaps, and fixes |
| `BUNDLE_ANALYSIS.md` | Bundle composition, large files, dynamic import opportunities |
| `PWA_RUNTIME_REVIEW.md` | PWA, hydration safety, rendering strategy |
| `RENDER_PERFORMANCE_REVIEW.md` | React rendering optimizations (useMemo, inline styles) |
| `SUPABASE_ACCESS_AUDIT.md` | Auth patterns, ownership checks, query duplication |
