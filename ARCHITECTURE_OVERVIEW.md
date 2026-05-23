# Architecture Overview — KAI 家計簿ダッシュボード

> 生成日: 2026-05-24

---

## スタック

| レイヤー | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | Next.js App Router | 16.2.6 |
| UI | React + Tailwind CSS 4 | 19.2.4 |
| 状態管理 | TanStack Query + URL params + useState | 5.x |
| DB / 認証 | Supabase (PostgreSQL + pgvector + RLS) | 2.x |
| AI | Anthropic Claude API (Sonnet / Haiku) | SDK 0.96 |
| OCR | PP-OCRv5 (paddleocr + ONNX Runtime) | - |
| テスト | Vitest + fast-check | 4.x |
| デプロイ | Vercel (Cron: 月初1日 01:15 UTC) | - |

---

## ディレクトリ責務

```
app/
  actions/          Server Actions（フォーム → DB, Zod検証 + revalidatePath）
  api/              API Routes（業務ロジック全集約。認証は requireAuth() 統一）
  [feature]/        Pages（サーバーコンポーネント。認証 + データ取得 → クライアントへ渡す）
  layout.tsx        ルートレイアウト: Sidebar + BottomBar + Providers

components/
  layout/           Sidebar・BottomBar・AddPickerSheet（全ページ横断）
  dashboard/        ダッシュボード UI（DashboardTabs 中心、791行）
  budget/           予算 UI
  transactions/     取引一覧・フィルター・CSV・OCR UI
  settings/         設定画面 UI パーツ
  kai/              デザインシステム（shared primitives, animations, PWA）
  ui/               shadcn/ui ベースコンポーネント（button, dialog, etc.）

lib/
  ai-classifier.ts  分類パイプライン（exact cache → RAG → LLM、1092行）
  ocr/              OCR サブシステム（13ファイル、pipeline.ts が統合）
  moneyforward-client.ts  MF 公式 API（Selenium / 791行）
  mf-browser.ts     MF 非公式 API（Playwright / 259行）
  score-calculator.ts  月間スコア・グレード（S/A/B/C/D）
  supabase/         client.ts（ブラウザ）+ server.ts（SSR）
  api-guard.ts      requireAuth() — 全 API Route 冒頭で必ず呼ぶ
```

---

## データフロー

### 取引 CRUD

```
User Input
  → AddPickerSheet (client component)
    → POST /api/transactions
      → requireAuth()
      → Supabase INSERT
      → recalculateScore()  ← 同期実行
      → return {transaction}
  → QueryClient.invalidateQueries(['transactions'])
```

### AI 分類パイプライン（ai-classifier.ts）

```
payee テキスト
  ⓪ category_corrections  (修正履歴DB・最優先)
  ① regex keyword rules    (keyword-rules.ts)
  ② exact RAG cache        (category_rag_cache テーブル)
  ③ vector similarity      (Voyage AI / pgvector cos_sim > 0.92)
  ④ vector + rerank        (cos_sim > 0.78)
  ⑤ LLM full               (Haiku freeform + JSON strict)
```

### OCR パイプライン（lib/ocr/pipeline.ts）

```
レシート画像 (base64)
  → blocks.ts       PP-OCRv5 ブロック抽出（ONNX Runtime）
  → normalize.ts    テキスト正規化
  → merchant.ts     店名抽出（チェーン解決）
  → amount.ts       金額抽出
  → date.ts         日付抽出
  → cache.ts        Supabase ocr_store_cache ルックアップ
  → ai-fallback.ts  全フィールド失敗時 Haiku フォールバック
```

### 月初 Cron（/api/cron/monthly）

```
毎月1日 01:15 UTC（vercel.json 定義）
  ① recalculateScore → monthly_scores 確定
  ② generateMonthlySummary → ai_monthly_summaries
  ③ generateBudgetAdvice → budgets
  ④ category_rag confidence 減衰
  ⑤ 固定費検出 → fixed_expense_suggestions
  ⑥ notifications クリーンアップ
  ⑦ push 通知送信（push-sender.ts）
  ⑧ category_corrections RAG 昇格（3回以上 → category_rag INSERT）
```

---

## 認証フロー

```
Google OAuth → /auth/callback → Supabase Auth
  → proxy.ts (= middleware相当 ※詳細後述) でセッション維持
  → 各 Page: supabase.auth.getUser() + redirect('/login')
  → 各 API Route: requireAuth(request)
```

> **警告**: `proxy.ts` は Next.js に `middleware.ts` として認識されていない可能性あり（後述）

---

## Supabase スキーマ概要（主要テーブル）

| テーブル | 用途 |
|---------|------|
| households / household_members | 世帯・メンバー（RLS 基軸） |
| transactions | 取引（世帯スコープ） |
| categories | カテゴリ（parent_id で2階層） |
| budgets | 月別予算 |
| monthly_scores | スコア永続化 |
| category_rag_cache | AI 分類 RAG キャッシュ（pgvector） |
| ai_monthly_summaries / ai_chat_history | AI 出力 |
| financial_goals | 目標管理 |
| fixed_expense_suggestions | 固定費提案 |
| push_subscriptions | Web Push |
| ai_classification_logs | 分類ロギング（管理者ダッシュボード用） |
| ai_cost_logs | AI コスト追跡 |
| ocr_store_cache | OCR 店舗キャッシュ |
| category_corrections | 修正履歴（User Memory） |

---

## 状態管理戦略

| 状態種別 | 実装 |
|---------|------|
| サーバーデータ | TanStack Query (`useQuery` / `useMutation`) |
| 月・フィルター | URL params (`?month=YYYY-MM&cat=xxx`) |
| モーダル・ドロワー | `useState` (ローカル) |
| テーマ | `next-themes` (localStorage) |
| 認証 | Supabase Auth（cookie） |

---

## PWA 構成

- `app/manifest.ts` → `/manifest.webmanifest`（動的生成）
- `public/sw.js` → Service Worker（インストール + Push 受信）
- `public/kai-sw.js` → **同一ファイル（未使用）**
- `components/providers.tsx` → SW 登録（`/sw.js`）+ installability
- `components/kai/InstallBanner.tsx` → A2HS 促進バナー
- `components/kai/HairlineSplash.tsx` → スプラッシュスクリーン

---

## 注目すべきアーキテクチャ上の課題

1. **proxy.ts が middleware として動作していない可能性** — ファイル名が `middleware.ts` でなく `proxy.ts`。Next.js はルートの `middleware.ts` のみを自動実行する。現在はページ単位の auth check でカバーしているが、セッション refresh が不足する可能性あり。
2. **DashboardTabs.tsx 791行** — NowTab / GoalTab / DesktopView が混在。分割候補。
3. **AddPickerSheet.tsx 1107行** — 手動入力・CSV・OCR・MF同期が1ファイルに混在。
4. **getCategoryIcon() の render 時呼び出し** — 3箇所で ESLint `react-hooks/static-components` 警告（BudgetDashboard / CategoryTransactionsPage / TransactionsView）。
5. **components/kai が tsconfig exclude** — TypeScript チェック外。型安全性の死角。
