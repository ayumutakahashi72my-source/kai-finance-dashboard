# KAI — AI搭載 家計管理ダッシュボード

Next.js 14・Supabase・Claude AI を使ったフルスタック家計管理Webアプリです。
実際の家族での利用を想定して設計しており、モダンなフルスタック開発のポートフォリオ作品でもあります。

**デモ：** [kai-finance-dashboard.vercel.app](https://kai-finance-dashboard.vercel.app)

---

## 機能

### コア機能
- **取引管理** — 登録・編集・削除・カテゴリ分類・CSV取込み（Money Forward形式）
- **レシートOCR** — PP-OCRv5 + 3層RAGパイプライン（ルール→店舗キャッシュ→Haiku）でレシート写真から自動入力
- **AI自動分類** — Haiku によるカテゴリ自動推定（キーワード＋embeddingハイブリッドRAG、Haiku呼び出し約80%削減）
- **Money Forward自動同期** — 非公式APIをVercel Cronで定期実行、ヘッドレスブラウザでセッション管理
- **月次スコア** — 貯蓄率・予算遵守率・分類カバレッジを総合した財務健全スコア（月初Cronで確定永続化）
- **固定費自動検出** — 直近3ヶ月で3回以上同一payeeの支出を固定費候補として検出・承認/却下UI

### AI / LLM 機能
- **月次サマリー** — Sonnet が毎月の支出傾向をナラティブで要約
- **四半期深層分析** — Opus が四半期ごとに700〜1000字の詳細レポートを生成し `quarterly_insights` に保存
- **AIチャット** — 自分の取引履歴をコンテキストに質問できる対話UI（月20回/¥2,000上限）
- **予算アドバイス** — Haiku が3ヶ月ローリング平均をもとにカテゴリ別予算を提案
- **支出異常検知** — 前3ヶ月平均との乖離が±30%以上のカテゴリを自動フラグ（`monthly_anomaly_flags`）
- **AIコスト追跡** — モデル別トークン使用量を `ai_cost_logs` に記録、管理者ダッシュボードで日次コスト確認

### UI / UX
- **PlanA デザインシステム** — KAIトークンベースの統一デザイン（`lib/kai-tokens.ts` + CSS変数）
- **ダーク/ライトモード完全対応** — `next-themes` + `:root` / `:root.light` CSS変数システム
- **PWA対応** — Service Worker・インストールバナー・スプラッシュ画面（DESIGN-LOCKED）
- **モバイルファースト** — BottomBar・シートモーダル・スワイプ操作・PayPay風テンキー
- **カレンダービュー** — 日付ドット表示→タップでボトムシート展開
- **分析タブ** — 月次/全期間切替・カテゴリドーナツチャート・貯蓄率トレンド・裁量支出分析
- **Airbnb風ログイン画面** — 暖色グラデーション・Googleサインイン（DESIGN-LOCKED）
- **全画面Skeleton UIによるローディング統一**

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 App Router・TypeScript・Tailwind CSS・Recharts |
| データフェッチ | TanStack Query v5・Zod |
| バックエンド | Next.js API Routes（業務ロジック全集約） |
| データベース | Supabase（PostgreSQL + pgvector + RLS） |
| 認証 | Supabase Google OAuth + Middleware |
| AI | Anthropic Claude — Opus 4.8（四半期分析）/ Sonnet 4.6（サマリー・チャット）/ Haiku 4.5（分類・予算提案・OCR） |
| OCR | PP-OCRv5 (ONNX + sharp) — サーバーサイドで推論 |
| Cron | Vercel Cron Jobs（月次・四半期） |
| デプロイ | Vercel |
| テスト | Vitest・Playwright（E2E） |
| CSVパース | papaparse |

---

## アーキテクチャ

```
app/
  api/           # 業務ロジックはすべてここに集約（API Routes）
    ai/          # サマリー・チャット・四半期分析
    budget/      # 予算提案・スコア
    cashflow/    # 収入/支出/貯蓄率API
    cron/
      monthly/   # 月初ロールアップ（スコア確定・サマリー・固定費検出・RAG decay）
      quarterly/ # 四半期深層分析（Opus）
    fixed-expenses/ # 固定費検出・承認・却下
    transactions/ # CRUD・CSV取込み・AI分類・OCR
    settings/    # MF連携・メンバー管理・通知設定
  analytics/     # 分析ページ（月次/全期間タブ）
  budget/        # 予算ダッシュボード + カテゴリドリルダウン
  calendar/      # カレンダービュー
  login/         # Airbnb風ログイン画面
  legal/         # 利用規約・プライバシー・Cookie・データポリシー
  settings/      # 設定（MF連携・目標・通知・カテゴリ・メンバー）
  admin/         # 管理者ダッシュボード（AI分析・コスト）

components/
  dashboard/     # DashboardTabs・MonthlyView・NowTab・AnalyticsTab・AiChatPanel
  budget/        # BudgetDashboard・FixedExpenseCard・CashflowCard・SavingsRateTracker
  transactions/  # 一覧・フィルター・CSV取込み・レシートOCR・PayPay風テンキー
  calendar/      # カレンダーグリッド＋ボトムシート
  auth/          # LoginScreen・BigKaiMark（DESIGN-LOCKED）
  kai/           # HairlineSplash・KaiScreen（DESIGN-LOCKED）
  layout/        # BottomBar・Sidebar・AddPickerSheet・Header

lib/
  kai-tokens.ts          # KAIデザインシステムトークン（CSS変数参照）
  ai-classifier.ts       # Haiku分類パイプライン（5段階フィルタリング）
  fixed-expense-detect.ts # 固定費自動検出（共通ロジック）
  embedder.ts            # pgvector embedding + RAGルックアップ
  merchant-canonical.ts  # 店舗名表記ゆれ正規化（RAGキーミスマッチ対策）
  keyword-rules.ts       # インメモリキーワードルール（コスト0分類）
  ocr.ts                 # PP-OCRv5 + 3層RAGパイプライン
  score-calculator.ts    # 複合スコア計算
  moneyforward-client.ts # MF非公式APIクライアント
  mf-browser.ts          # MFセッション用ヘッドレスブラウザ
  hooks/
    use-swipe-dismiss.ts # スワイプで閉じる共通フック
  supabase/
    server.ts            # 通常API Routes用クライアント（anon key + ユーザーセッション）
    admin.ts             # Cron専用adminクライアント（service_role key、RLSバイパス）
```

**主な設計方針：**
- 業務ロジックはAPI Routesに100%集約 — Supabaseはデータ/Auth専用、ブラウザから直接書き込みは行わない
- RAG分類はキーワード→embedding の2段階ルックアップでLLM呼び出しを削減（キャッシュヒット率 約80%）
- サーバー状態はTanStack Query、月/フィルター選択はURLパラメータ、モーダル開閉のみuseState
- Cronルートのみ `service_role` クライアント使用（CRON_SECRET 認証＋サーバー限定）、フロント・通常API Routesは anon key のみ
- 全APIルート冒頭で `requireAuth(request)` を呼ぶ認証ガード必須

---

## RAG分類パイプライン（詳細）

KAIのAI分類は段階的なコスト最適化パイプラインで構成されています。

### カテゴリ分類（取引登録時）

```
① キーワードルール    in-memory マッチ          コスト $0
② exactキャッシュ     category_rag exact検索     コスト $0
③ pgvector類似検索   similarity ≥ 0.92 で採用   コスト $0
④ LLM rerank         0.70〜0.92 の候補をHaikuに渡して最終判定
⑤ 全件Haiku分類      上記をすべて外れた場合のみ
```

③・④は `category_rag` テーブルに `payee_key`（正規化済み店舗キー）と `confidence`（0〜1）・`embedding` を保持。
ユーザーがカテゴリを修正するたびに `category_corrections` に記録し、**月初Cron が3回以上の修正履歴を自動でRAGに昇格**する。
`confidence` は月初Cronで ×0.95 の自然減衰（`decay_category_rag_confidence`）を掛けて陳腐化を防ぐ。

### OCR 3層RAGパイプライン（レシート読取時）

```
① ルールベース       keyword-rules.ts でインスタント判定
② ocr_store_cache   過去のレシートOCR結果を店舗名でキャッシュ
③ Haiku            上記ミス時のみLLM呼び出し（結果はキャッシュに書き戻し）
```

OCR自体は PP-OCRv5（ONNX Runtimeモデル）をサーバーサイドで実行。Vercel Lambda上で動くよう `@sparticuz/chromium-min` と同様の手法でモデルファイルをバンドル。

### RAGドリフト検知（CIガード）

`normalizeKeyword()` の出力が変わると既存の `payee_key` がすべてキャッシュミスになる。これを防ぐため `__tests__/rag-drift.test.ts` が出力スナップショットを固定し、5%以上変化した場合にCIが検出する。

---

## データベーススキーマ

46本のマイグレーションで段階的に構築：

**基本テーブル**
`households` → `household_members` → `transactions` → `categories` → `budget_suggestions` → `monthly_scores` → `financial_goals`

**AI・RAGテーブル**
`category_rag` — pgvector embedding + confidence 付きキャッシュ
`category_corrections` — ユーザー修正履歴（Cronでcategory_ragへ昇格）
`merchant_embedding_cache` — payee embedding キャッシュ（再計算防止）
`ocr_store_cache` — レシートOCR店舗名→カテゴリキャッシュ
`user_category_knowledge` — ユーザー固有の分類知識

**分析テーブル**
`monthly_summaries` — Sonnet月次サマリー
`quarterly_insights` — Opus四半期深層分析レポート
`monthly_anomaly_flags` — 支出異常フラグ（±30%乖離）
`fixed_expense_suggestions` — 固定費候補（Cron検出）
`ai_cost_logs` — モデル別コスト記録
`ai_health_snapshots` — AI分類精度スナップショット

**インフラテーブル**
`push_subscriptions` → `notifications` → `api_error_logs` → `chat_histories` → `household_invites`

全テーブルにRLS（Row Level Security）を設定し、世帯単位のデータアクセス制御を実装。

---

## ローカル開発

### 前提条件
- Node.js 22+
- Supabaseプロジェクト（無料プランで可）
- Anthropic APIキー
- Google OAuth認証情報

### セットアップ

```bash
git clone https://github.com/ayumutakahashi72my-source/kai-finance-dashboard.git
cd kai-finance-dashboard
npm install
```

`.env.local` を作成：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ANTHROPIC_API_KEY=your_anthropic_key
# Cron専用（サーバーのみ）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_cron_secret
```

`supabase/migrations/` 内のSQLファイルをSupabase SQLエディタで順番に実行後：

```bash
npm run dev
```

### テスト実行

```bash
npm test              # Vitest ユニットテスト
npm run e2e           # Playwright E2Eテスト
npm run test:coverage # カバレッジレポート（e2e/は除外）
```

テストスイート：スコア計算境界値・CSV重複検知・RAGヒット判定・RAGドリフト検知・コスト回帰テスト。

---

## CI/CD

GitHub Actionsでpush時にlint・型検査・Vitestを実行。
VercelはPR時にプレビューデプロイ、`main`マージで本番デプロイ。
Vitest と Playwright が同一リポジトリに共存するため `vitest.config.ts` の `exclude: ['e2e/**']` で分離。

---

## 開発の流れ

週次スプリントで、基本CRUDからAI統合・OCR・PlanAリデザイン・PWAまでインクリメンタルに構築。
スキーマ変更は番号付きマイグレーション46本で追跡し、各API設計は `docs/` に仕様書として残している。

| Week | 実装内容 |
|------|---------|
| 1 | 環境構築（Next.js・Supabase・Vercel・Google OAuth） |
| 2 | 取引CRUD基本（登録・一覧・削除） |
| 3 | マルチ世帯スキーマ設計（households / household_members / transactions） |
| 4 | カテゴリテーブル・階層構造設計 |
| 5 | CSV取込み（Money Forward形式）＋MF非公式API連携・Vercel Cronによる自動取込み |
| 6 | AI自動分類（Haiku）・RAGキャッシュ（キーワード + pgvector embedding 2段階ルックアップ） |
| 7 | 予算提案・支出クセ分析（Haiku 統合呼び出し） |
| 8 | 月次サマリー生成（Sonnet）・AIチャット機能 |
| 9 | ダッシュボードUI（月切替・AiSummaryCard・AiChatPanel・カレンダービュー） |
| 10 | 予算ダッシュボード（BudgetDashboard・ScoreRing・BudgetSuggestCard・SpendingPatternCard） |
| 11 | 取引編集・削除（PATCH/DELETE API + UI）・月次スコア永続化・月初Cron |
| 12 | Skeleton UI全画面適用・レシートOCR（PP-OCRv5 + 3層RAG）・ScoreCard・四半期Cron |
| 13 | 固定費管理UI（承認/却下）・目標設定UX改善・収入管理（CashflowCard・SavingsRateTracker）・Recharts動的importによるバンドル分割 |
| 14 | PlanAリデザイン — ダッシュボード2タブ化・BottomBar統一・PayPay風テンキー・収支検索バー・カテゴリフィルターチップ |
| 15 | 全画面ライトモード対応 — KAIトークンシステム構築・ハードコード色をCSS変数に置換・ログイン画面リデザイン |
| 16 | PWA対応 — Service Worker・スプラッシュ画面・インストールバナー・法的ページ |
| 17 | 分析タブ強化・固定費検出共通化・コードレビュー修正・技術負債解消 |

---

## 実際に詰まったこと・バグ・設計修正の記録

### Service WorkerがSet-Cookieヘッダーを握りつぶしてセッション消失（PR #34）

**発生：** PWA対応後、ユーザーがログインしても数分後にセッションが切れる現象が繰り返し発生。

**原因：** Service Workerの `respondWith(fetch(request))` がSupabaseの認証レスポンスに含まれる `Set-Cookie` ヘッダーを無視していた。ブラウザはSWを経由したレスポンスの `Set-Cookie` を処理しない仕様であり、Supabaseのセッションリフレッシュトークンがブラウザに保存されなかった。

**修正：** `/api/auth/` パスと `supabase` を含むリクエストをSWのfetchハンドラからバイパスし、ブラウザネイティブの fetch に処理させるように変更。

**学び：** SWは便利だが、認証系のリクエストを通すと予期しないヘッダー消失が起きる。特に `Set-Cookie` はSW経由では機能しないことをドキュメント化した。

### Middleware認証Cookie消失バグ（PR #32）

**発生：** 特定のページ遷移後にログイン状態が失われる。

**原因：** Next.js Middlewareが `NextResponse.next()` でレスポンスを返す際、Supabaseの `@supabase/ssr` が設定する認証Cookieが正しく伝播されていなかった。Middlewareの `updateSession()` が新しいレスポンスオブジェクトを生成するが、元のレスポンスヘッダーとマージされずにCookieが消失していた。

**修正：** Middleware内で `updateSession()` の戻り値をそのまま return するよう統一。カスタムヘッダーの追加は `updateSession()` の前に行い、Cookieチェーンを壊さないように修正。

### ANTHROPIC_API_KEY の BOM 混入による ai/chat 500エラー

**発生：** AIチャットが突然500エラーを返すようになった。

**原因：** `.env.local` をWindowsのメモ帳で編集した際に、ファイル先頭にBOM（Byte Order Mark: `﻿`）が混入。`process.env.ANTHROPIC_API_KEY` の先頭に不可視文字が含まれ、Anthropic APIが認証エラーを返していた。

**修正：** 環境変数の読み取り時に `.trim()` を追加。根本的にはBOMなしUTF-8で保存するよう運用ルールを策定。

### AI分類パイプラインの破綻と再設計

当初の設計は「Haikuで全件分類すれば速くて安い」という楽観的な前提だった。
実際に動かすと **1ヶ月分の取引100件を分類するだけで数百円のコストが発生**し、家計管理アプリとして成立しないことに気づいた。

対策として段階的な分類パイプラインを構築した：

```
① キーワードルール（in-memory、コスト0）
② exactキャッシュ（DB検索、コスト0）
③ pgvector ベクトル類似検索（similarity ≥ 0.92 で直接採用）
④ LLM rerank（0.70〜0.92 の候補をHaikuに渡して最終判定）
⑤ 全件Haiku分類（上記を全部外れた場合のみ）
```

この結果、Haiku呼び出しを約80%削減できた。

### RAGが「動いているように見えて実はLLMを呼んでいた」問題

pgvector を使った類似検索を実装したが、しばらく運用していると **RAGキャッシュのヒット率が0%** に近い状態が続いていた。原因を調べると：

- `normalizeKeyword()` 関数を途中で改修（法人格の除去・サフィックス削除ルールを追加）したことで、DB に保存済みの `payee_key` と新規取引の `payee_key` が一致しなくなっていた
- 結果として「キャッシュに存在するはずの取引」も全てHaikuに流れており、コスト削減効果がゼロになっていた

修正として `canonicalizeMerchant()` 層を追加し、`normalizeKeyword` の出力をさらに意味的に正規化（「セブンイレブン渋谷店」「セブンイレブン新宿三丁目」→ 同一キー）してからハッシュを生成することで、表記ゆれによるキャッシュミスを防いだ。

この経験から、**RAG系の変更は既存のembedding全体に影響する** ことを学び、`normalizeKeyword` の出力スナップショットをテストで固定し、5%以上変化した場合はCIで検出する仕組みを入れた（`__tests__/rag-drift.test.ts`）。

### Haikuの分類が「存在しないカテゴリ名」を返す問題

Haikuにカテゴリ分類を依頼すると、たまに **定義していないカテゴリ名（例：「外食費」「サブスク費」）を返す** ことがあった。これをそのままDBに保存すると、ダッシュボードの集計が壊れる。

対策：
1. プロンプトにカテゴリ名の完全リストをJSON配列で渡し、**そのリスト外の文字列を返すことを明示的に禁止**
2. Zodスキーマで `z.enum([...categoryNames])` として厳密にバリデーション
3. バリデーション失敗時はretryせず `api_error_logs` に記録してスキップ（壊れたデータを保存しない）

### Cron が anon key で RLS をバイパスできず無音失敗

月初Cronはすべての世帯に対してループを回す設計だったが、ある時期から **実際には何も処理されていない** ことに気づいた。

原因：`createClient()` はユーザーセッション Cookie からトークンを取得するが、Cronは HTTP クライアントなのでセッションがない。結果として anon ロールで動作し、`households: SELECT USING (owner_id = auth.uid())` が `auth.uid() = null` を返すため 0件になっていた。

解決：`lib/supabase/admin.ts` に `service_role_key` を使う専用クライアントを作成し、Cron Routeでのみ使用。フロント・通常 API Routes は引き続き anon key のみを使う原則を維持した。

### Money Forward連携でVercel Lambdaがクラッシュした問題

MF連携にPlaywrightのヘッドレスブラウザを使ったが、デプロイすると **Lambda起動時にクラッシュ** するようになった。

原因：
- Playwrightは標準でChromiumバイナリを同梱するが、Vercel Lambdaの**250MB圧縮バンドル制限**を超えていた
- `@sparticuz/chromium-min` に切り替えた後も、`playwright-core/browsers.json` がLambdaのファイルトレーシングに含まれず実行時に「browsers.json not found」エラーが発生した

解決：`next.config.ts` の `outputFileTracingIncludes` で `browsers.json` を強制的にバンドルに含める設定を追加。この問題は公式ドキュメントには載っておらず、GitHubのissueと格闘して解決した。

### スコア計算のデータ不整合

月次スコアをリアルタイムで計算する設計にしたところ、**取引を1件削除するたびにスコアが変わり**、月をまたぐと「確定済みのはずのスコア」が過去に遡って変化してしまった。

解決：2段階設計を採用。
- **当月中**: 取引の編集・削除のたびに `score_recalc_queue` 経由で再計算（リアルタイム）
- **月初Cron**: 前月スコアを `monthly_scores.is_finalized = true` として永続化し、以降は変更不可

### BottomBar useSearchParams ビルドエラー

**発生：** Vercelデプロイ時に `useSearchParams()` が静的ページでエラー。

**原因：** Next.js App Routerでは `useSearchParams()` を使うコンポーネントは `<Suspense>` で囲む必要がある。BottomBarはlayout.tsxに直接配置されていたため、ビルド時に静的解析でエラーになった。

**修正：** BottomBarを `<Suspense fallback={null}>` で囲んで動的レンダリングに切り替え。

### スプラッシュ画面の縦中央ずれ（3回修正）

**1回目：** `safe-area-inset-top` のフォールバック値が不適切で、ノッチ付きiPhoneでロゴが上にずれた。→ フォールバックを `24px` に調整。

**2回目：** OAuth認証後のリダイレクト時に `visualViewport.offsetTop` が変動し、スプラッシュの中心位置がジャンプした。→ `useLayoutEffect` でペイント前に同期的に位置を計算するよう修正。

**3回目：** iOS Safariで URLバーの表示/非表示に伴い `visualViewport` が変動し、コンテンツが visual 中心より上にずれた。→ `visualViewport` の `resize` / `scroll` イベントで動的に `paddingTop` を補正。

### OCRが常に手動入力にフォールバックする問題

**発生：** レシートOCR実装後、全てのOCR結果が手動入力ステップにリダイレクトされる。

**原因：** PP-OCRv5のONNXモデルから返るテキストブロックに `.raw()` メソッドが存在しないバージョンのランタイムを使用していた。`block.raw()` の呼び出しで例外が発生し、catch節で手動入力にフォールバックしていた。

**修正：** `.raw()` の代わりに `.text` プロパティを直接参照するよう変更。

### ライトモード対応で発見された問題群

PlanAリデザイン時に全画面のライトモード対応を行った際、以下の問題が連鎖的に発見された：

1. **ハードコード色の散在** — 約200箇所以上の `rgba(240,240,245,...)` がダークモード前提でハードコードされていた。→ KAIトークンシステム（`lib/kai-tokens.ts`）を構築し、CSS変数経由で一括切替可能にした。

2. **ログイン画面のGoogle OAuthボタン** — Googleのブランドガイドラインに従いつつ、ダーク/ライト両方に対応するため、`--kai-login-google-*` CSS変数を導入。

3. **global-error.tsx がレイアウト外** — エラーページはlayoutの外でレンダリングされるため、CSS変数が利用できない。`prefers-color-scheme` media queryで独自のカラースキームを定義して解決。

4. **HairlineSplash（スプラッシュ画面）の色** — DESIGN-LOCKEDコンポーネントだが、`rgba(240,240,245,...)` がハードコードされていた。レイアウト制約を変えずにKAIトークンに置換。

### 固定費検出の回帰バグ（コードレビューで発見）

**発生：** 固定費検出ロジックを2箇所（API Route + Cron）から共通関数に抽出した際に発生。

**原因：** 共通関数 `detectFixedExpenses()` に `matchesFixedCategory()` / `matchesFixedPayee()` フィルタを追加したが、旧Cronコードにはこのフィルタがなかった。キーワードリストに含まれない独自サブスク名（例：個人契約のSaaS）が固定費候補から漏れる回帰バグ。

**修正：** フィルタを削除し、旧Cronと同じ「全支出をMap集約→3ヶ月以上出現するものを候補」のロジックに戻した。

### Supabase Security Advisor 警告の一括対応

本番運用開始後、Supabase Security Advisorが複数の警告を検出した。主な問題と対処：

**`function_search_path_mutable`（全ストアドファンクション）**
`SECURITY DEFINER` 関数に `SET search_path` が未設定だと、攻撃者が `search_path` を操作して別のスキーマの関数を差し込める。全関数を `SET search_path = ''` で再作成し、テーブル参照を `public.` 修飾に統一した。ベクトル演算（`<=>`）は `public` スキーマに依存するため、該当関数のみ `SET search_path = 'public'` とした。

**`anon_security_definer`（`get_household_members_with_email` など）**
`REVOKE FROM anon` では不十分であることが判明。`anon` ロールは `PUBLIC` を継承するため、`PUBLIC` への GRANT が残っていると anon からも実行できる。`REVOKE ALL FROM PUBLIC` の後に必要なロールへ明示的に `GRANT` する手順に修正した。

**`decay_category_rag_confidence` の過剰権限**
マイグレーション019で `GRANT TO authenticated` が付与されており、ログイン済みユーザーが任意の世帯の confidence を減衰できる状態だった。`REVOKE FROM authenticated` の後 `GRANT TO service_role` に変更し、Cron（service_role）からのみ呼び出せるようにした。

### Node.js 20→22 アップグレード + npm ci ECONNRESET

**発生：** CI（GitHub Actions）で `npm ci` が断続的に `ECONNRESET` で失敗。

**原因：** Node.js 20のHTTPクライアントにネットワーク不安定時のリトライが不十分。npmレジストリへの接続がタイムアウトしていた。

**修正：** Node.js 22にアップグレードし、`npm ci` にリトライ設定を追加。

### マージコンフリクトの頻発

**発生：** feature ブランチが長期化すると、main とのマージコンフリクトが毎回発生。特に `dashboard-utils.tsx`、`AnalyticsTab.tsx`、`nav.ts` で頻発。

**原因：** 複数のPRが同じファイル（ダッシュボード系・ナビ定義）を同時に変更していた。

**対処：** 定期的に `git merge origin/main` を実行してブランチを最新に保つ運用を導入。コンフリクト解消時はHEAD（feature側）の変更を優先し、main側の変更が必要な場合は手動でマージ。

---

## ライセンス

Private — ポートフォリオ用途
