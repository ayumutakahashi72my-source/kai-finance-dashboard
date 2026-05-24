# Tech Debt: requireAuth() migration

Date: 2026-05-24  
Priority: Medium  
Effort: ~1 hour

## 問題

以下4ルートが `requireAuth()` を使わず、auth check を手動でインラインしている。

```
app/api/categories/route.ts
app/api/transactions/route.ts
app/api/transactions/classify/route.ts
app/api/fixed-expenses/route.ts
```

各ルートで `createClient()` + `auth.getUser()` + `household_members` lookup を個別実装しており、
エラーレスポンスの形式も統一されていない。

## 修正方針

各ルートの冒頭の手動auth blockを削除し、`requireAuth(request)` に置き換える。

```typescript
// Before
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const { data: membership } = await supabase.from('household_members')...
```

```typescript
// After
const { supabase, householdId } = await requireAuth(request)
```

## 注意

`cron/monthly/route.ts` は cron-token auth なので対象外。  
`invite/[token]/route.ts` は public invite なので対象外。

## 影響範囲

各ルートの先頭 15–25 行のみ変更。ビジネスロジックは一切変更しない。
