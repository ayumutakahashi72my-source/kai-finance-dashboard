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

週次スプリントで約11週間かけて段階的に機能を追加。
基本CRUDからAI統合、本番グレードのダッシュボードまでをインクリメンタルに実装。
スキーマ変更は番号付きマイグレーションで追跡、各API設計は `docs/` に仕様書として残している。

AI分類パイプラインは3段階で進化：キーワードルールのみ → キーワード＋Haikuフォールバック → キーワード＋pgvector RAG＋Haikuフォールバック。
RAGレイヤーの導入でHaiku呼び出しを約80%削減しながら分類精度を維持。
