# Access Pattern Standardization Plan

Date: 2026-05-24

## Current patterns

### Pattern A — `requireAuth()` (canonical, 12 routes)
```typescript
const auth = await requireAuth()
if (!auth.ok) return auth.response
const { supabase, user, householdId, isAdmin } = auth
```
Resolves: auth + householdId + isAdmin in one call. Error responses are consistent.

Routes using this pattern:
- `app/api/goals/route.ts`
- `app/api/goals/[id]/route.ts`
- `app/api/goals/[id]/calculate/route.ts`
- `app/api/budgets/route.ts`
- `app/api/transactions/bulk-delete/route.ts`
- `app/api/transactions/duplicates/route.ts`
- `app/api/transactions/cleanup-card-transfers/route.ts`
- `app/api/transactions/ocr/route.ts`
- `app/api/settings/members/route.ts`
- `app/api/settings/members/invite/route.ts`
- `app/api/settings/categories/fix-colors/route.ts`
- `app/api/admin/analytics/route.ts`

### Pattern B — inline auth (18 routes)
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

const { data: membership } = await supabase
  .from('household_members')
  .select('household_id')
  .eq('user_id', user.id)
  .limit(1)
  .single()
if (!membership) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })
```
Duplicates ~10 lines per file. Error messages may drift. Misses `isAdmin`.

### Pattern C — custom helper (1 route)
`app/api/fixed-expenses/route.ts` — local `getHouseholdId()` function duplicating the same household lookup.

### Pattern D — token / cron auth (special, do not migrate)
- `app/api/invite/[token]/route.ts` — invite token flow, no household yet
- `app/api/cron/monthly/route.ts` — CRON_SECRET header auth
- `app/api/cron/mf-import/route.ts` — CRON_SECRET header auth

## Canonical pattern

```typescript
import { requireAuth } from '@/lib/api-guard'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { supabase, user, householdId } = auth
  // ...business logic...
}
```

Rules:
- Always destructure only what is needed
- Never re-create a supabase client after calling requireAuth
- `select('*')` → explicit column list (avoids over-fetching)

## Migration candidates

### Tier 1 — safe, no behavior change (migrate now)

| Route | Pattern | Risk | Notes |
|---|---|---|---|
| `app/api/categories/route.ts` | B | Low | Simple GET, `select('*')` → explicit |
| `app/api/transactions/route.ts` | B | Low | GET with filters, supabase passes through |
| `app/api/transactions/classify/route.ts` | B | Low | POST, `user.id` available as `auth.user.id` |
| `app/api/fixed-expenses/route.ts` | C | Low | Remove local helper, use requireAuth |

### Tier 2 — migrate when touching for other reasons

| Route | Notes |
|---|---|
| `app/api/ai/chat/route.ts` | Complex, defer unless refactoring |
| `app/api/ai/summary/route.ts` | Complex, defer unless refactoring |
| `app/api/settings/mf/route.ts` | MF integration, separate risk surface |
| `app/api/settings/mf/sync/route.ts` | MF integration, separate risk surface |
| `app/api/settings/mf/logs/route.ts` | Simple GET, can migrate opportunistically |
| `app/api/budget/suggest/route.ts` | AI route, defer |
| `app/api/push/subscribe/route.ts` | Push API, defer |
| `app/api/push/unsubscribe/route.ts` | Push API, defer |
| `app/api/feedback/route.ts` | Simple POST, can migrate opportunistically |
| `app/api/transactions/[id]/route.ts` | PATCH/DELETE, careful scoping needed |
| `app/api/transactions/classify-one/route.ts` | AI route, defer |
| `app/api/transactions/import/csv/route.ts` | Complex import logic, defer |
| `app/api/settings/household/leave/route.ts` | Destructive op, defer |

### Do NOT migrate

| Route | Reason |
|---|---|
| `app/api/invite/[token]/route.ts` | Token auth, no user session at call time |
| `app/api/cron/monthly/route.ts` | CRON_SECRET auth, no user context |
| `app/api/cron/mf-import/route.ts` | CRON_SECRET auth, no user context |

## Unsafe areas

- `select('*')` in `categories/route.ts` and `fixed-expenses/route.ts` — fetches all columns including any future sensitive additions; replace with explicit column lists
- `fixed-expenses/route.ts` local `getHouseholdId()` — duplicates household lookup without is_admin check; if admin-gated features are added later this would silently skip the check
- Inline auth error messages may diverge from `requireAuth()` canonical messages over time

## Implementation order

1. ✅ Plan documented
2. ✅ Migrate Tier 1 (categories, transactions GET, classify, fixed-expenses) — 2026-05-24
3. [ ] Migrate Tier 2 opportunistically when those routes are touched
4. [ ] Update api-conventions.md to reference this plan

## Non-goals

- DB schema changes
- RLS changes
- RPC redesign
- Breaking the invite/cron special auth flows
