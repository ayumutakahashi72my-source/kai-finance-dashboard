# Performance Findings — KAI 家計簿ダッシュボード

> 生成日: 2026-05-24

---

## 🔴 Critical（即対応推奨）

### 1. getCategoryIcon() が render 中に呼ばれている（3箇所）

**問題**: `getCategoryIcon(name)` は `LucideIcon` コンポーネント型を返す。これを render 関数内で大文字変数に代入し JSX タグとして使用すると、React が毎 render に新コンポーネント型として評価し、状態リセットや不要な再マウントが発生し得る。ESLint `react-hooks/static-components` がこれを警告している。

**箇所**:
- `components/budget/BudgetDashboard.tsx:113` — `const CatIcon = getCategoryIcon(cat.name)`
- `components/budget/CategoryTransactionsPage.tsx:243` — `const CatIcon = getCategoryIcon(catName)`
- `components/transactions/TransactionsView.tsx:92` — `const CatIcon = getCategoryIcon(name)`

**修正**: `useMemo` でコンポーネント参照を安定化する。

```tsx
// Before
const CatIcon = getCategoryIcon(cat.name)
return <CatIcon size={13} />

// After
import { useMemo } from 'react'
const CatIcon = useMemo(() => getCategoryIcon(cat.name), [cat.name])
return <CatIcon size={13} />
```

---

### 2. TransactionFilters の setState in useEffect

**問題**: `TransactionFilters.tsx:53` でフィルター値を `useEffect` 内で複数の `setState` で更新している。これにより cascading re-render が発生する。

```tsx
// 現在（問題あり）
useEffect(() => {
  setQ(initial.q); setCat(initial.cat); setFrom(initial.from)
  setTo(initial.to); setMin(initial.min); setMax(initial.max)
}, [search])
```

**修正**: フィルター状態を1つのオブジェクトにまとめ、`useReducer` か `setState` 一回で済むようにする。

---

## 🟡 Warning（中優先）

### 3. DashboardTabs.tsx 791行（巨大コンポーネント）

モバイル NowTab / GoalTab / デスクトップ KPI の3つの責務が混在。re-render 範囲が広い。

**推奨分割**:
- `NowTab.tsx` — 今月の支出・取引リスト
- `GoalTab.tsx` — 目標進捗
- `DesktopDashboard.tsx` — デスクトップ KPI グリッド

---

### 4. AddPickerSheet.tsx 1107行（最大コンポーネント）

手動入力・CSV・OCR・MF 同期の4機能が1ファイルに混在。状態管理が複雑化し、どの機能変更も全体 re-render のリスクがある。

**推奨分割**:
- `ManualEntryTab.tsx` — 手動入力フォーム
- `CsvImportTab.tsx` — CSV（既に `CsvImportDialog.tsx` があるが統合されていない）
- `OcrCaptureTab.tsx` — OCR フロー
- `MfSyncTab.tsx` — MF 同期

---

### 5. Server Component の活用余地

現在クライアントコンポーネントになっているが、データ取得のみで状態なし・ハンドラなしのコンポーネントが複数ある。

| コンポーネント | 現状 | 移行可否 |
|-------------|------|---------|
| `app/legal/*/page.tsx` | 静的コンテンツ | ✅ 既に Server Component |
| `components/budget/SpendingPatternCard.tsx` | 静的表示 | ✅ 既に Server Component 相当 |
| `components/households/CreateHouseholdForm.tsx` | フォームあり | ❌ Client 必要 |

---

### 6. console.log / console.error の本番残留

**箇所**:
- `components/providers.tsx:22,33` — `[PWA] controller` ログ
- `lib/mf-browser.ts:50,51,75,76,173,174,290,291` — エラーログ（適切だが過多）

本番の console ログはパフォーマンスより情報漏洩のリスクが問題。`DEBUG=true` 環境変数でのみ出力するよう制限推奨。

---

## 🟢 Info（低優先・参考情報）

### 7. PWA キャッシュ戦略が minimal

現在の `sw.js` はインストール、アクティベート、fetch（空ハンドラ）、Push のみ。ネットワーク不調時のオフライン対応なし。必要なら `Cache First` 戦略の追加を検討。

### 8. OCR モデル（~21MB）の配信

`public/models/` に ONNX モデルを配置。初回アクセス時に 21MB ロードが発生。Vercel CDN でキャッシュされるが、初回ダウンロードの UX 改善余地あり（progress indicator 等）。

### 9. Recharts が全ページバンドルに含まれる可能性

予算ページとアドミンページでのみ使用。`dynamic(() => import('recharts'), {ssr: false})` で必要な場合のみロード可能。

---

## bundle サイズ影響度（推定）

| パッケージ | Bundle への影響 | 対策 |
|-----------|---------------|------|
| `lucide-react` | 中（named import で tree-shaking） | 現状維持 |
| `recharts` | 大（~200KB）| dynamic import 化候補 |
| `react-markdown` | 中（~30KB） | 現状維持（summaryページのみ） |
| OCR 関連 | なし（server external） | 済み |
| MF 関連 | なし（server external） | 済み |

---

## 推奨対応優先順

| 優先度 | 対応 | 工数 |
|-------|------|------|
| 🔴 高 | getCategoryIcon useMemo 修正（3箇所） | 15分 |
| 🔴 高 | setState in useEffect 修正（TransactionFilters） | 30分 |
| 🟡 中 | DashboardTabs 分割 | 2-3時間 |
| 🟡 中 | AddPickerSheet 分割 | 3-4時間 |
| 🟢 低 | PWA キャッシュ戦略追加 | 1時間 |
| 🟢 低 | Recharts dynamic import | 30分 |
