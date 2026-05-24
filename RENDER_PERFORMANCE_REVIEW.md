# React Rendering Performance Review

Generated: 2026-05-24

---

## Critical Issues

### 1. Inline Style Objects in NowTab.tsx (82 instances)

Every inline `style={{ ... }}` creates a new object per render. React performs a shallow equality check on props; a new object always fails the check, causing all children with inline styles to re-render even when the value hasn't changed.

**Highest-frequency example in NowTab.tsx:**
```tsx
// Current — new object every render
<div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>

// Fix — stable reference
const S = {
  row: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 },
} as const
<div style={S.row}>
```

Extract the 10–15 most-reused style combos (panel card, flex-row, section header, mono label) to a module-level `const S = {...} as const`. This won't require changing any layout or visual behavior.

**Estimated impact**: Reduces per-render object allocations by ~60 on the dashboard page.

### 2. Donut Arc Geometry in NowTab.tsx (`CategoryRingHero`)

The donut arc SVG path calculation runs on every render of NowTab. When the user switches tabs or any ancestor re-renders, this geometry is recalculated even when `segments` hasn't changed.

```typescript
// Current — recalculates on every render
const arcs = segments.reduce<ArcData[]>((acc, [name, { amount, color }], i) => {
  const sweep = (amount / total) * Math.PI * 2
  // ... trig calculations
  return acc
}, [])

// Fix — memoize
const arcs = useMemo(() => segments.reduce<ArcData[]>(...), [segments, total])
```

**Estimated impact**: Eliminates trig calculations on tab switch re-renders.

### 3. Missing `useMemo` in BudgetDashboard.tsx

Category totals, bar widths, and sorted category lists are computed inline. On any re-render (hover state, dialog open/close, date change), these recalculate.

Candidates for memoization:
- `const sorted = categories.sort(...)` → `useMemo(() => [...categories].sort(...), [categories])`
- Budget percentage calculations → `useMemo(() => ..., [budget, spent])`

---

## Medium Issues

### 4. `useCallback` Missing in TransactionList.tsx

626-line component with no memoization. Edit/delete handlers are recreated on every render. Since `TransactionList` is a large component that re-renders on optimistic updates, this matters.

```typescript
// Add to each handler:
const handleEdit = useCallback((tx: Transaction) => {
  setEditTarget(tx)
}, [])

const handleDelete = useCallback((id: string) => {
  setDeleteTarget(id)
}, [])
```

### 5. Inline Callbacks in JSX Props

Pattern found in multiple components:
```tsx
// Creates new function reference on every render
<button onClick={() => setStep('picker')}>

// For frequently re-rendered parents, prefer:
const handlePickerStep = useCallback(() => setStep('picker'), [])
<button onClick={handlePickerStep}>
```

AddPickerSheet already uses `useCallback` for its handlers — extend this pattern to TransactionList and BudgetDashboard where handlers are passed deep.

---

## Low Priority / Won't Fix

### 6. `React.memo` on Child Components

`CategoryRingHero`, `DesktopKpiCard`, `DesktopRecentTx` inside NowTab re-render when NowTab re-renders. Since they all depend on the same data props, wrapping them with `React.memo` would save little — they'd still re-render when month or filter changes.

**Recommendation**: Skip `React.memo` here; add only if profiler shows specific components hot.

### 7. Recharts `AreaChart` Static Import

Recharts loads on dashboard initial render. Since the dashboard is the primary page for authenticated users, the deferred load would only benefit the login → dashboard transition.

**Recommendation**: Add `dynamic(() => import(...), { ssr: false })` as a low-priority follow-up, not blocking.

---

## Currently Well-Optimized

- `CalendarView.tsx`: 6 `useMemo` calls covering heatmap, daily totals, and sorted data ✅
- `AddPickerSheet.tsx`: `useCallback` on `handleClose`, `handleDone`, `handleImportDone` ✅
- `CategoryTransactionsPage.tsx`: `useCallback` on sort handler ✅
- `Sidebar.tsx`: `useCallback` on picker open ✅
- All data fetching via TanStack Query (built-in deduplication and cache) ✅

---

## Recommended Implementation Order

1. **Extract style constants from NowTab.tsx** — top 15 most-reused combos → module-level `const S = {...} as const`
2. **Add `useMemo` for donut arc calculation** in `CategoryRingHero`
3. **Add `useMemo` for category totals** in BudgetDashboard
4. **Add `useCallback` for handlers** in TransactionList (3–4 handlers)
5. (Optional) Dynamic import recharts via NowTab/AnalyticsTab

Steps 1–4 are mechanical and low-risk. Each can be done independently in <30 minutes.

---

## Profiling Recommendation

Before optimizing further, run React DevTools Profiler on:
- Dashboard tab switch (Now → Analytics → Strategy)
- Month navigation (MonthSwitcher click)
- Filter change in /transactions

These are the highest-frequency user interactions. Profile first, optimize what the profiler confirms is slow.
