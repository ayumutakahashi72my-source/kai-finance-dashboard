# PWA / Hydration / Rendering Audit

Generated: 2026-05-24

---

## PWA

### Service Worker (`public/sw.js`)

```
Status: FUNCTIONAL — push notifications only
Caching: NONE (intentional — empty fetch handler for Android Chrome installability)
Offline support: NONE
```

The SW is intentionally minimal. The empty `fetch` handler satisfies Android Chrome's installability requirement without introducing cache complexity. **This is a deliberate trade-off, not a bug.**

**Risk**: Cache versioning is absent. Post-deploy, users on old SW versions won't auto-update until the browser triggers an SW update cycle. The `activate` event exists (line 7–8) but performs no cache cleanup.

**Safe improvement** (optional):
```js
// public/sw.js — add to activate handler if offline support is later desired
const CACHE_VERSION = 'kai-v1'
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  )
})
```

### Manifest

All required PWA fields present:

| Field | Value |
|---|---|
| `id` | `/` |
| `name` | `kai — 家計簿管理` |
| `short_name` | `kai` |
| `display` | `standalone` |
| `start_url` | `/login` |
| `background_color` | `#0a0a10` |
| `theme_color` | `#0a0a10` |
| `icons` | 192px + 512px, `any` + `maskable` |

iOS Apple Web App config: startup images for SE, XR, X/XS, 12–14, Pro Max breakpoints.  
**Installability: Full compliance on Android Chrome, Samsung Internet, and iOS Safari.**

### PWA Install Capture Pattern

Two-phase `beforeinstallprompt` capture:
1. Inline script in `layout.tsx` (`window.__pwaInstallEvent = null` + listener) — runs before React hydration
2. `InstallBanner.tsx` reads `window.__pwaInstallEvent` inside `useEffect`

This correctly avoids the race condition where React mounts after the browser fires `beforeinstallprompt`. Pattern is solid.

---

## Hydration

### `suppressHydrationWarning`

Used in exactly **one place**: `<html lang="ja" suppressHydrationWarning>` in `app/layout.tsx`.

Justified — font CSS variables are injected into the `className` and may differ between SSR and first client hydration. No other usage detected in the entire codebase.

### Browser API Safety

All browser API calls (`window`, `navigator`, `sessionStorage`, `localStorage`, `Notification`, `matchMedia`) are wrapped in `useEffect` hooks. No render-time browser API calls detected.

`useLayoutEffect` in `HairlineSplash.tsx` for `window.visualViewport` is correct — layout effects run client-only and are appropriate for viewport measurement.

### Render-Time Date/Random Calls

No `Math.random()`, `Date.now()`, or `new Date()` calls in render scope detected.

`ManualEntryTab.tsx` uses `today()` (from `_shared.tsx`) as the `useState` initializer — this is a lazy initializer, called once on mount, not on every render. Safe.

**Hydration status: ✅ Clean — no detected mismatches.**

---

## Rendering

### Static Generation Opportunities

Currently all routes are fully dynamic (SSR on demand). One optimization is available:

**Legal pages** (`/legal/privacy`, `/legal/terms`, `/legal/cookie`, `/legal/data`) contain no user data. They currently re-render on every request.

```typescript
// app/legal/privacy/page.tsx — add:
export const revalidate = 3600
```

This converts them to ISR (cached for 1 hour, revalidated on background request). Minimal user impact.

### Loading / Error Boundary Coverage

| Route | `loading.tsx` | `error.tsx` |
|---|---|---|
| `/login` | ✅ | ❌ |
| `/` (dashboard) | ❌ | ❌ |
| `/budget` | ❌ | ❌ |
| `/transactions` | ❌ | ❌ |
| `/settings/*` | ❌ | ❌ |
| `/calendar` | ❌ | ❌ |

TanStack Query + `Skeleton` components provide component-level loading states, which covers most cases. Page-level `loading.tsx` would improve perceived performance for initial server data fetches, but is not causing visible bugs.

**If adding `loading.tsx`**: Place them at the route group level (`app/(dashboard)/loading.tsx`) to avoid duplicating skeleton markup.

### Data Fetching Architecture

- Server pages: `createClient()` + `auth.getUser()` → pass data as props to client components
- Client components: TanStack Query for refetches and mutations
- Server Actions: used for mutations (`createTransaction`, `createHousehold`)
- `searchParams` typed as `Promise<{...}>` (correct for Next.js 14 async params)

**Architecture is well-structured. No recommended changes.**

---

## Summary

| Area | Status | Notes |
|---|---|---|
| PWA installability | ✅ Complete | All manifest fields correct |
| Service Worker | ✅ Intentional minimal | No cache = no stale-cache bug |
| Cache versioning | ⚠️ Missing | Low risk while SW has no caching |
| Hydration safety | ✅ Excellent | No mismatches, minimal `suppressHydrationWarning` |
| Browser API guards | ✅ Consistent | All in `useEffect` |
| Static generation | ⚠️ Opportunity | Legal pages can add `revalidate = 3600` |
| Loading boundaries | ⚠️ Minimal | Covered by Skeleton + TanStack; page-level optional |
| Error boundaries | ⚠️ Minimal | Only login page; low priority for logged-in flows |
