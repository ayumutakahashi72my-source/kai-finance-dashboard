# Bundle & Rendering Performance Analysis

Generated: 2026-05-24

---

## Bundle Composition

### Large Client-Side Libraries

| Library | Approx Size | Current Status | Risk |
|---|---|---|---|
| recharts | ~220KB gzip | Static import in NowTab + AnalyticsTab | Medium — loads on every dashboard visit |
| lucide-react | ~varies | Named imports in 26 files | ✅ Tree-shaking active |
| onnxruntime-node | ~130MB | Server-only (`serverExternalPackages`) | ✅ Never sent to client |
| sharp | — | Server-only (`serverExternalPackages`) | ✅ Never sent to client |
| playwright-core | — | Server-only (`serverExternalPackages`) | ✅ Never sent to client |
| @anthropic-ai/sdk | — | API Routes only | ✅ Never sent to client |

### Dynamic Imports

**Zero dynamic imports detected.** Everything is statically bundled.

**Highest-value dynamic import candidates:**

```typescript
// In DashboardTabs.tsx or the parent page
const NowTab = dynamic(() => import('@/components/dashboard/NowTab'), {
  ssr: false,
  loading: () => <Skeleton variant="default" />,
})
const AnalyticsTab = dynamic(() => import('@/components/dashboard/AnalyticsTab'), {
  ssr: false,
  loading: () => <Skeleton variant="default" />,
})
```

This defers recharts (~220KB) until the user views the dashboard. For a logged-in flow where dashboard is primary, impact is minimal — but it removes recharts from the login/landing bundle.

---

## Lucide React Import Pattern

All 26 files use named imports (`import { Sparkles, X } from 'lucide-react'`) — tree-shaking is working correctly. No barrel import anti-patterns found.

---

## Large Component Files

Files over 400 lines that are entirely client-rendered:

| File | Lines | Primary Concern |
|---|---|---|
| `TransactionList.tsx` | 626 | Multiple dialogs (edit, delete, pin) bundled in one module |
| `BudgetDashboard.tsx` | 578 | Chart calculations + multiple card types |
| `NowTab.tsx` | 510 | Donut geometry + recharts + animation all in one module |
| `CategoryTransactionsPage.tsx` | 489 | Page + drawer + edit dialog |
| `TransactionsView.tsx` | 460 | View + filters + balance bar |
| `CategoryList.tsx` | 457 | CRUD list + edit form |

These are structural concerns, not necessarily bundle concerns (they're route-split automatically by Next.js). However large files increase parse time on slower devices.

---

## React Rendering Concerns

### Inline Style Objects (High Impact)

`NowTab.tsx` has **82+ inline style objects** — each creates a new object reference per render, preventing React's fast-path reconciliation:

```tsx
// Current (creates new object every render)
<div style={{ display: 'flex', gap: 12, padding: '14px 16px', animation: 'kai-rise .8s ease-out both' }}>

// Better (stable reference, zero allocation per render)
const styles = {
  card: { display: 'flex', gap: 12, padding: '14px 16px', animation: 'kai-rise .8s ease-out both' },
} as const
<div style={styles.card}>
```

`BudgetDashboard.tsx` has **59+ inline style objects** with the same issue.

**Impact**: On filter change, month switch, or any parent re-render, every inline-styled node re-evaluates style objects. For a 510-line component this compounds.

### Missing Memoization

| Component | Lines | `useMemo` | `useCallback` | Risk |
|---|---|---|---|---|
| `NowTab.tsx` | 510 | 0 | 0 | High — donut arc geometry recalculated every render |
| `BudgetDashboard.tsx` | 578 | 0 | 0 | High — category totals recalculated every render |
| `TransactionList.tsx` | 626 | 0 | 0 | Medium — list grouping computed inline |
| `CalendarView.tsx` | 429 | 6 ✅ | — | Good |
| `AddPickerSheet.tsx` | 148 | 0 | 3 ✅ | Fine (lightweight) |

**NowTab donut arc calculation** is the highest-value memoization target:
```typescript
// Current: recalculates on every render
const arcs = segments.reduce(...)

// Better: only when data changes
const arcs = useMemo(() => segments.reduce(...), [segments])
```

---

## Next.js Configuration Notes

`turbopack` is enabled (faster dev). `serverExternalPackages` correctly isolates all Node.js-only packages from the client bundle.

**Missing:**
- No bundle analyzer (`@next/bundle-analyzer`) — add `ANALYZE=true npm run build` support
- No explicit image optimization config for `app-icon-192.png` (now using `<Image>` — handled)

---

## Action Plan (Priority Order)

| Priority | Action | Effort | Impact |
|---|---|---|---|
| P1 | Add `useMemo` for donut arc calc in NowTab | 15 min | High |
| P1 | Extract inline style constants from NowTab (top 20 most-used) | 30 min | High |
| P2 | Dynamic import recharts via NowTab + AnalyticsTab | 20 min | Medium |
| P2 | Add `useMemo` for category totals in BudgetDashboard | 20 min | Medium |
| P3 | Extract EditDialog from TransactionList.tsx | 45 min | Low |
| P3 | Add `@next/bundle-analyzer` to next.config.ts | 10 min | Visibility |

---

## Not Recommended

- Converting recharts to a different charting library (design freeze)
- Removing inline styles wholesale (design freeze, would require CSS Modules or Tailwind)
- Splitting NowTab into more files (already extracted from 794-line DashboardTabs.tsx)
