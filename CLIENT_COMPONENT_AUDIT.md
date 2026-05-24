# Client Component Audit

Generated: 2026-05-24

## Summary

56 client components identified. Most are legitimately interactive.  
**3 immediate conversions** (Tier 1) and **3 partial refactors** (Tier 2) are viable.

---

## Tier 1 — Immediate Safe Conversions

### 1. `app/settings/corrections/page.tsx`
**Current:** `'use client'` — but zero hooks, just renders `<CorrectionHistory />`  
**Action:** Remove `'use client'`. Server Component wrapping a client child is valid.

### 2. `components/budget/BudgetSuggestCard.tsx`
**Current:** `'use client'` — pure presentational, no hooks detected  
**Action:** Remove `'use client'` after verifying no prop callbacks use browser APIs.

### 3. `components/ui/CategoryIcon.tsx`
**Current:** `'use client'` — likely just renders a Lucide icon  
**Action:** Remove `'use client'` — icon components are pure render, no state needed.

---

## Tier 2 — Partial Refactors (Low Priority)

### 4. `components/dashboard/DashboardTabs.tsx`
Tab bar state (`activeTab`) must stay client. Individual tab *content* can stay as-is —
they're already fast since data is passed as props from the parent server page.

### 5. `components/layout/Sidebar.tsx`
Uses `usePathname()` for active link highlight. Can't be a server component. No refactor needed.

### 6. `components/transactions/TransactionList.tsx`
Uses `useOptimistic()` — must be client. The list row rendering is cheap relative to the
optimistic update benefit. No refactor needed.

---

## Why Most Components Cannot Be Converted

| Reason | Components |
|---|---|
| `useState` / form state | ManualEntryTab, CategoryList, GoalPage, BudgetDashboard, … |
| `useRouter` / `usePathname` | Sidebar, BottomBar, MonthSwitcher, LogoutButton |
| `useQuery` / `useMutation` (TanStack) | AiSummaryCard, AiChatPanel, AiChatPanel, … |
| Browser APIs (camera, clipboard, push) | ReceiptCapture, NotificationToggle, InstallBanner |
| Animation / RAF | BigKaiMark, HairlineSplash, NowTab |
| `QueryClientProvider` wrapper | providers.tsx |

---

## `components/kai/shared/index.tsx` — Note

Contains `useCountUp` and `useTypewriter` hooks (legitimately client).  
The `'use client'` directive is correct here.

---

## Action Plan

```
1. Remove 'use client' from app/settings/corrections/page.tsx
2. Verify BudgetSuggestCard.tsx hooks (read file) then remove if safe
3. Verify CategoryIcon.tsx (read file) then remove if safe
```

No structural changes needed beyond these three removals.
