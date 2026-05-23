# Refactor Plan — KAI 家計簿ダッシュボード

> 生成日: 2026-05-24

---

## Phase 1: Safe Auto-Fix（今すぐ実施、リスクなし）

### 1-A. 未使用 import / 変数の削除

| ファイル | 対象 |
|---------|------|
| `app/api/transactions/cleanup-card-transfers/route.ts` | `req` パラメータ → `_req` |
| `app/api/transactions/import/csv/route.ts` | `classifyTransactions` import 削除 |
| `app/calendar/page.tsx` | `monthLabel` 変数削除 |
| `app/page.tsx` | `BLUE` 定数削除 |
| `components/budget/CategoryTransactionDrawer.tsx` | `useRouter`, `useQueryClient` import 削除 |
| `components/budget/CategoryTransactionsPage.tsx` | `currentMonthStr` 関数削除 |
| `components/transactions/TransactionList.tsx` | `SelectValue` import、`today` 変数削除 |
| `lib/mf-browser.ts` | `cookieNames` 変数削除 |
| `lib/monthly-summary.ts` | `CategoryTotal` type import 削除 |
| `lib/ocr/blocks.ts` | 無効 `eslint-disable` ディレクティブ削除 |
| `lib/ocr/pipeline.ts` | `_cc` 変数削除（他の `_` prefix 変数は意図的未使用） |

### 1-B. 不要ファイルの削除

- `public/kai-sw.js` — `sw.js` と完全同一
- `public/models/det.onnx` — 0バイト旧モデル

### 1-C. getCategoryIcon() の render 時呼び出し修正

3箇所で `useMemo` を使用してコンポーネント参照を安定化:
- `components/budget/BudgetDashboard.tsx`
- `components/budget/CategoryTransactionsPage.tsx`
- `components/transactions/TransactionsView.tsx`

---

## Phase 2: Structural Improvements（要コードレビュー）

### 2-A. proxy.ts の動作確認と整理

**問題**: `proxy.ts` が Next.js middleware として認識されているか不明。

**手順**:
1. `proxy.ts` を `middleware.ts` にリネームして動作確認
2. セッション refresh が正常に機能するか検証
3. `proxy.ts` は削除

**影響範囲**: 認証フロー全体（auth redirect）

### 2-B. 重複 MF 設定ページの統一

**手順**:
1. `app/settings/integrations/mf/page.tsx` を canonical に決定
2. `components/layout/AddPickerSheet.tsx:1118` のリンクを `/settings/integrations/mf` に更新
3. `app/settings/mf/page.tsx` を削除
4. `/settings/mf` → `/settings/integrations/mf` の redirect 追加（next.config.ts）

### 2-C. TransactionFilters の setState in useEffect 修正

フィルター状態を1オブジェクトに統合し、cascade re-render を防止:

```tsx
// Before: 6個の個別 state
const [q, setQ] = useState(initial.q)
const [cat, setCat] = useState(initial.cat)
// ...

// After: 1つのオブジェクト state
const [filters, setFilters] = useState({
  q: initial.q, cat: initial.cat, from: initial.from,
  to: initial.to, min: initial.min, max: initial.max,
})
// useEffect で一括更新
useEffect(() => {
  setFilters({ q: initial.q, cat: initial.cat, ... })
}, [search])
```

---

## Phase 3: Component Split（大規模変更、慎重に）

### 3-A. DashboardTabs.tsx 分割（791行）

現在の構成:
```
DashboardTabs.tsx
  ├── SpendRing（SVG リング）
  ├── CategoryRow（カテゴリ行）
  ├── NowTab（今月サマリー）
  ├── GoalTab（目標）
  ├── DesktopKpiCard
  └── DesktopView（デスクトップ KPI）
```

推奨分割:
```
components/dashboard/
  ├── DashboardTabs.tsx    （タブ制御のみ、~100行）
  ├── NowTab.tsx           （今月サマリー、~250行）
  ├── GoalTab.tsx          （目標進捗、~150行）
  └── DesktopView.tsx      （デスクトップ KPI、~200行）
```

### 3-B. AddPickerSheet.tsx 分割（1107行）

現在: 手動入力・CSV・OCR・MF同期が混在

推奨分割:
```
components/layout/
  ├── AddPickerSheet.tsx    （タブ制御のみ）
  ├── tabs/
  │   ├── ManualEntryTab.tsx
  │   ├── OcrCaptureTab.tsx
  │   └── MfSyncTab.tsx     （CsvImportDialog は既存を流用）
```

---

## Phase 4: TypeScript 強化（長期）

### 4-A. components/kai を tsconfig から除外しない

**問題**: `tsconfig.json` に `"exclude": ["components/kai"]` があり、型チェック外。

**リスク**: `shared/index.tsx` などの問題が型エラーとして検出されない。

**修正**: `exclude` から `components/kai` を削除し、型エラーを解消する。

### 4-B. `any` の排除

`lib/ai-classifier.ts` や OCR 系で `any` キャストが使われている箇所の型定義追加。

---

## 実施禁止事項（CLAUDE.md 準拠）

- DB スキーマ変更（migrations）
- auth フロー の大幅変更
- OCR コアアルゴリズム変更
- RAG 検索ロジック変更
- デザイントークン / スタイル変更
- Service Worker キャッシュキー変更

---

## 進捗チェックリスト

- [ ] Phase 1-A: 未使用 import/変数 削除
- [ ] Phase 1-B: dead ファイル削除
- [ ] Phase 1-C: getCategoryIcon useMemo 修正
- [ ] Phase 2-A: proxy.ts → middleware.ts 検討
- [ ] Phase 2-B: MF 設定ページ統一
- [ ] Phase 2-C: TransactionFilters 修正
- [ ] Phase 3-A: DashboardTabs 分割
- [ ] Phase 3-B: AddPickerSheet 分割
- [ ] Phase 4-A: components/kai tsconfig 除外解除
- [ ] Phase 4-B: any 排除
