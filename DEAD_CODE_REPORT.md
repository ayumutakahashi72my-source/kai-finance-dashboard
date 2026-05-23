# Dead Code Report — KAI 家計簿ダッシュボード

> 生成日: 2026-05-24

---

## Safe to Remove（安全に削除可能）

### ファイル

| パス | 理由 | 参照数 |
|-----|------|--------|
| `public/kai-sw.js` | `public/sw.js` と完全に同一（diff 0）。コードは `/sw.js` のみ登録。 | 0 |
| `public/models/det.onnx` | 0 バイト（空ファイル）。旧モデル。`PP-OCRv5_mobile_det_infer.onnx` が現行。コード参照なし。 | 0 |

### 未使用 import / 変数（ESLint 警告 41件）

| ファイル | 行 | 内容 |
|---------|-----|------|
| `app/api/transactions/cleanup-card-transfers/route.ts` | 10, 35 | `req` パラメータ未使用 |
| `app/api/transactions/import/csv/route.ts` | 4 | `classifyTransactions` import 未使用 |
| `app/calendar/page.tsx` | 45 | `monthLabel` 変数未使用 |
| `app/page.tsx` | 15 | `BLUE` 定数未使用 |
| `components/budget/CategoryTransactionDrawer.tsx` | 4, 5 | `useRouter`, `useQueryClient` import 未使用 |
| `components/budget/CategoryTransactionsPage.tsx` | 38 | `currentMonthStr` 関数未使用 |
| `components/transactions/TransactionList.tsx` | 15, 28 | `SelectValue` import、`today` 変数未使用 |
| `lib/mf-browser.ts` | 82 | `cookieNames` 変数未使用 |
| `lib/monthly-summary.ts` | 7 | `CategoryTotal` type import 未使用 |
| `lib/ocr/blocks.ts` | 15, 17, 19 | 無効な `eslint-disable` ディレクティブ |
| `lib/ocr/pipeline.ts` | 34-36, 179 | `_merchant`, `_householdId`, `_supabase`, `_cc` 変数未使用 |

---

## Needs Verification（要確認）

| パス | 不確実な理由 |
|-----|------------|
| `proxy.ts` | Next.js middleware は `middleware.ts` のみ自動実行される。`proxy.ts` という名前では Next.js が middleware として認識しない可能性が高い。ただし意図的にファイル名を変えてある（git history: "fix: remove middleware.ts — conflicts with existing proxy.ts"）。**動作確認が必要**。削除は危険。 |
| `app/settings/mf/page.tsx` | `/settings/integrations/mf` と並存する旧MF設定ページ。`AddPickerSheet.tsx:1118` が `/settings/mf` へのリンクを持つ。どちらを canonical にするか確認が必要。 |
| `components/kai/shared/index.tsx` | 480行のデザインシステムコンポーネント群（`DesktopShell`, `KaiSidebar`, `StreamingDots`, `GlintLine`, `BlinkCaret`, `PhoneShell`, `CAvatar`, `KaiLogo`, `useTypewriter`）。tsconfig の `exclude: ["components/kai"]` により型チェック外。`@/components/kai/shared` のパス解決は `shared.tsx`（ファイル優先）が勝つため **実質インポートされていない**。ただし設計資産として保持する意図がある可能性。 |
| `lib/supabase.ts` | `./supabase/client` からの re-export ラッパー。grep 上では誰もこのパスを import していない（全員 `@/lib/supabase/client` や `@/lib/supabase/server` を直接使用）。削除しても問題ないが念のため確認推奨。 |

---

## Duplicate Implementations（重複実装）

### A: `components/kai/shared.tsx` vs `components/kai/shared/index.tsx`

| 項目 | `shared.tsx` | `shared/index.tsx` |
|-----|-------------|-------------------|
| 行数 | 318行 | 480行 |
| 性質 | サーバー安全（use client なし）| クライアント専用（use client） |
| パス解決 | `@/components/kai/shared` で**実際に使われる** | 誰もインポートしない |
| 主要export | `MONO_STYLE`, `Icon`, `KaiSystemBrand`, `Ring` | `useCountUp`, `useTypewriter`, `DesktopShell`, etc. |
| tsconfig | excludeされている | excludeされている |

**推奨**: `shared.tsx` が canonical。`shared/index.tsx` の一部有用なコンポーネント（`useCountUp`等）は `components/kai/hooks.ts` にすでに移動済み。

### B: `public/sw.js` vs `public/kai-sw.js`

完全同一。`sw.js` が canonical（providers.tsx + NotificationToggle.tsx で登録）。

**推奨**: `kai-sw.js` を削除。

### C: `app/settings/mf/page.tsx` vs `app/settings/integrations/mf/page.tsx`

内容はほぼ同じ（UI スタイルが微妙に異なる）。`integrations/mf` が新しい実装。

**推奨**: `integrations/mf` を canonical にし、`settings/mf` を削除 + `AddPickerSheet.tsx:1118` のリンクを更新。

---

## 到達不能・未接続

| パス | 理由 |
|-----|------|
| `scripts/generate-splash.ts` | 開発時生成スクリプト。スプラッシュ画像は既に `public/splash/` に存在。CI では実行されない。 |
| `scripts/download-ocr-models.ts` | OCRモデルダウンロードスクリプト。モデルは既にコミット済み（.gitkeep）。 |
| `extract_pdf.mjs` | 規約PDF抽出ツール（一時スクリプト）。法規ページは既に更新済み。保持する理由は薄い。 |

---

## コメントアウト・デバッグコード

| ファイル | 行 | 内容 |
|---------|-----|------|
| `lib/mf-browser.ts` | 50, 51, 75, 76 | `console.error` — 本番コードに残ったデバッグ出力 |
| `components/providers.tsx` | 22, 33 | `console.log('[PWA] controller...')` — デバッグログ |

---

## まとめ：削除推奨 LOC

| カテゴリ | 概算 LOC |
|---------|---------|
| 未使用ファイル（safe） | ~0（バイナリ・空ファイル） |
| 未使用import/var（safe） | ~20 行 |
| 重複ファイル（要確認） | ~480 行（shared/index.tsx） |
| 旧設定ページ（要確認） | ~100 行（settings/mf） |
| 一時スクリプト（safe） | ~30 行（extract_pdf.mjs） |
