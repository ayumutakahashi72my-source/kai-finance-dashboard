# Supabase Access Layer Audit

Generated: 2026-05-24

---

## Auth Check Pattern Consistency

### Routes using `requireAuth()` (8 routes)

These consistently call `requireAuth()` as the **first statement** in each handler:

```
app/api/budgets/route.ts
app/api/transactions/bulk-delete/route.ts
app/api/goals/route.ts
app/api/goals/[id]/route.ts
app/api/goals/[id]/calculate/route.ts
app/api/settings/members/route.ts
app/api/settings/members/invite/route.ts
app/api/admin/analytics/route.ts
app/api/transactions/ocr/route.ts
```

### Routes using manual auth (19 routes)

These inline their own `createClient()` + `supabase.auth.getUser()` + membership lookup:

```
app/api/categories/route.ts
app/api/transactions/route.ts
app/api/transactions/[id]/route.ts
app/api/transactions/classify/route.ts
app/api/fixed-expenses/route.ts
app/api/cron/monthly/route.ts  (cron-token auth — correct exception)
app/api/invite/[token]/route.ts (public invite — correct exception)
```

**Issue**: Two routes that should use `requireAuth()` instead duplicate the pattern inline — `categories`, `transactions`, `fixed-expenses`, `transactions/classify`.

**Recommendation** (medium priority): Migrate the 4 non-cron/non-invite routes to `requireAuth()` to get uniform error responses and reduce ~20 lines of auth boilerplate each.

---

## Household Ownership Verification

Every data operation correctly filters by `household_id`. No ownership verification gaps found.

**Variable naming inconsistency** across files:
- `householdId` — used by `requireAuth()` consumers (8 routes) ✅
- `hid` — used in `fixed-expenses/route.ts`, `cron/monthly/route.ts`
- `membership.household_id` — used inline in `transactions/route.ts`, `categories/route.ts`

No security issue — all access data correctly. Naming inconsistency is a readability concern only.

---

## `select('*')` Usage

Only 3 occurrences, all justified:

| File | Table | Justification |
|---|---|---|
| `app/api/fixed-expenses/route.ts` | `fixed_expense_suggestions` | All fields returned to UI |
| `app/api/categories/route.ts` | `categories` | All fields needed for category picker |
| `app/actions/categories.ts` | `categories` | All fields needed for dropdowns |

No optimization needed — small tables, all columns consumed.

---

## RPC Calls

| File | Function | Purpose |
|---|---|---|
| `app/api/settings/members/route.ts` | `get_household_members_with_email` | Fetch members + emails (admin) |
| `app/api/cron/monthly/route.ts` | `decay_category_rag_confidence` | Monthly confidence decay |
| `app/api/invite/[token]/route.ts` | `get_invite_info` | Read invite before accepting |
| `app/api/invite/[token]/route.ts` | `accept_household_invite` | Atomic invite acceptance |
| `lib/ocr/cache.ts` | `ocr_cache_upsert` | Atomic cache write (prevents race) |

All RPCs are used for operations that genuinely require atomic SQL or JOIN operations not expressible in single-table queries. Appropriate usage.

---

## Duplicate Query Patterns (Candidates for Shared Helper)

### Pattern: Get household ID from user ID

Appears 10+ times across the codebase in 3 variants:

**Variant A** — Local helper function (2 files):
```typescript
// app/api/fixed-expenses/route.ts AND app/api/transactions/[id]/route.ts
async function getHouseholdId(supabase, userId) {
  const { data } = await supabase
    .from('household_members').select('household_id')
    .eq('user_id', userId).limit(1).single()
  return data?.household_id ?? null
}
```

**Variant B** — Inline membership check (4 files):
```typescript
const { data: membership } = await supabase
  .from('household_members').select('household_id')
  .eq('user_id', user.id).limit(1).single()
if (!membership) return NextResponse.json({ error: '世帯が見つかりません' }, { status: 400 })
const householdId = membership.household_id
```

**Variant C** — Via `requireAuth()` (the cleanest — 8 routes):
```typescript
const { supabase, householdId } = await requireAuth(request)
```

**Proposed fix**: Migrate Variant B routes to `requireAuth()`. Variant A helpers can remain as-is or be removed after migration.

**Impact**: ~40–60 lines removed across 4 routes.

---

## Proposal: No New Shared Query File Needed

`lib/api-guard.ts` already provides the canonical shared pattern via `requireAuth()`. The fix is not to create a new file, but to migrate the 4 remaining routes to use what already exists.

**Explicitly NOT recommended**:
- `withHouseholdFilter()` wrapper (over-abstraction — the `.eq('household_id', id)` is readable inline)
- `getCategoriesMap()` shared utility (only 2 callsites, each needs different columns)

---

## Security Posture

- `service_role_key` usage: **None detected** ✅ (anon key only, per project policy)
- RLS: All tables queried via anon client — RLS policies are the second defense layer
- Ownership filtering: `.eq('household_id', householdId)` present on every query ✅
- Admin routes: Use `requireAdmin: true` flag in `requireAuth()` ✅

---

## Summary

| Area | Status | Action |
|---|---|---|
| `requireAuth()` usage | ⚠️ Mixed | Migrate 4 routes from manual auth |
| Ownership verification | ✅ Comprehensive | No gaps |
| `select('*')` | ✅ Justified | No changes |
| RPC usage | ✅ Appropriate | No changes |
| Query duplication | ⚠️ Pattern repeated | Migrate to `requireAuth()` |
| Security (`service_role_key`) | ✅ Clean | No changes |
| Naming consistency | ⚠️ Minor | Cosmetic only |
