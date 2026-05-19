# KAI — AI搭載 家計管理ダッシュボード

Next.js 14・Supabase・Claude AI を使ったフルスタック家計管理Webアプリです。
実際の家族での利用を想定して設計しており、モダンなフルスタック開発のポートフォリオ作品でもあります。

**デモ：** [kai-finance-dashboard.vercel.app](https://kai-finance-dashboard.vercel.app)

---

## 機能

### コア機能
- **取引管理** — 登録・編集・削除・カテゴリ分類・CSV取込み（Money Forward形式）
- **AI自動分類** — Haiku によるカテゴリ自動推定（キーワード＋embeddingハイブリッドRAGキャッシュ）
- **Money Forward自動同期** — 非公式APIをVercel Cronで定期実行、ヘッドレスブラウザでセッション管理
- **月次スコア** — 貯蓄率・予算遵守率・分類カバレッジを総合した財務健全スコア

### AI / LLM 機能
- **月次サマリー** — Sonnet が毎月の支出傾向をナラティブで要約
- **AIチャット** — 自分の取引履歴をコンテキストに質問できる対話UI
- **予算アドバイス** — Haiku が3ヶ月ローリング平均をもとにカテゴリ別予算を提案
- **支出クセ分析** — 固定費・定期支出・異常支出を自動検出
- **AIコスト追跡** — モデル別トークン使用量を `ai_cost_logs` に記録、管理者ダッシュボードで日次コスト確認

### UI / UX
- モバイルファーストのレスポンシブレイアウト（ボトムナビ・シートモーダル）
- カレンダービュー（日付ドット表示→タップでボトムシート展開）
- 予算ダッシュボード（リングチャート・カテゴリドリルダウン・スコアカード）
- 全画面Skeleton UIによるローディング統一
- Web Push通知

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 App Router・TypeScript・Tailwind CSS・Recharts |
| データフェッチ | TanStack Query v5・Zod |
| バックエンド | Next.js API Routes（業務ロジック全集約） |
| データベース | Supabase（PostgreSQL + pgvector + RLS） |
| 認証 | Supabase Google OAuth |
| AI | Anthropic Claude — Sonnet 3.5（サマリー・チャット）/ Haiku 3（分類・予算提案） |
| Cron | Vercel Cron Jobs |
| デプロイ | Vercel |
| テスト | Vitest |
| CSVパース | papaparse |

---

## アーキテクチャ

```
app/
  api/           # 業務ロジックはすべてここに集約（API Routes）
    ai/          # サマリー・チャット
    budget/      # 予算提案・スコア
    cron/        # 月初ロールアップ・MF自動取込み
    transactions/ # CRUD・CSV取込み・AI分類
    settings/    # MF連携・メンバー管理・通知設定
  (pages)/       # App Router ページ群

components/
  dashboard/     # サマリーカード・グラフ・AIパネル
  budget/        # BudgetDashboard・ScoreRing・SpendingPatternCard
  transactions/  # 一覧・フィルター・CSV取込みダイアログ
  calendar/      # カレンダーグリッド＋ボトムシート
  kai/           # モバイル向けスクリーンラッパー

lib/
  ai-classifier.ts       # Haiku分類パイプライン
  embedder.ts            # pgvector embedding + RAGルックアップ
  score-calculator.ts    # 複合スコア計算
  moneyforward-client.ts # MF非公式APIクライアント
  mf-browser.ts          # MFセッション用ヘッドレスブラウザ
  monthly-summary.ts     # Sonnetサマリー生成
  budget-advisor.ts      # Haiku予算提案
  cost-tracker.ts        # モデル別コスト記録

supabase/migrations/    # スキーマ変更履歴（マイグレーション25本）
docs/                   # API規約・AI設計ルール・DBメモ・テスト方針
__tests__/              # Vitestユニットテスト（スコア・CSV・RAG・予測）
```

**主な設計方針：**
- 業務ロジックはAPI Routesに100%集約 — Supabaseはデータ/Auth専用、ブラウザから直接書き込みは行わない
- RAG分類はキーワード→embedding の2段階ルックアップでLLM呼び出しを削減（キャッシュヒット率 約80%）
- サーバー状態はTanStack Query、月/フィルター選択はURLパラメータ、モーダル開閉のみuseState

---

## データベーススキーマ

25本のマイグレーションで段階的に構築：

`households` → `household_members` → `transactions` → `categories` → `category_rag_cache` → `budget_suggestions` → `monthly_scores` → `fixed_expense_suggestions` → `financial_goals` → `ai_cost_logs` → `push_subscriptions` → `chat_histories` → ベクトル拡張（pgvector）

全テーブルにRLS（Row Level Security）を設定し、世帯単位のデータアクセス制御を実装。

---

## ローカル開発

### 前提条件
- Node.js 20+
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
```

`supabase/migrations/` 内のSQLファイルをSupabase SQLエディタで順番に実行後：

```bash
npm run dev
```

### テスト実行

```bash
npm test
```

スコア計算境界値・CSV重複検知・RAGヒット判定の3スイート。

---

## CI/CD

GitHub Actionsでpush時にlint・型検査・Vitestを実行。
VercelはPR時にプレビューデプロイ、`main`マージで本番デプロイ。

---

## 開発の流れ

週次スプリント11週間で、基本CRUDからAI統合・本番グレードダッシュボードまでインクリメンタルに構築。
スキーマ変更は番号付きマイグレーション25本で追跡し、各API設計は `docs/` に仕様書として残している。

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
| 11 | 取引編集・削除（PATCH/DELETE API + UI）・月次スコア永続化・月初Cron（スコア確定・サマリー・予算提案・固定費検出） |

---

## 実際に詰まったこと・設計の修正

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

この結果、Haiku呼び出しを約80%削減できた。ただし③のベクトル検索導入時に新たな問題が起きた。

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

### Supabase RLSのデバッグが難しかった問題

「データが表示されない」バグが何度か発生し、その都度「フロントのクエリが間違っているのか、RLSが弾いているのか」の切り分けに時間がかかった。

対処法として定めたルール：Supabaseのテーブルエディタで直接データを確認し、**DBにある → フロント問題 / ない → RLS問題** と切り分けてから調査する。`service_role_key` でRLSをバイパスするデバッグは絶対にしない（本番に混入するリスクがあるため）。
