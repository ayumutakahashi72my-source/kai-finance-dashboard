# KAI — 家計簿管理システム

家族用Webアプリ＋ポートフォリオ。Next.js 14 / Supabase / Vercel / Claude API。

## スタック（変更禁止）

FE：Next.js 14 App Router・TypeScript・Tailwind・Recharts・TanStack Query・Zod・papaparse・Vitest
BE：Next.js API Routes（業務ロジック全集約）・Vercel Cron
DB：Supabase（PostgreSQL・RLS・Google OAuth）
AI：Sonnet（サマリー・チャット）/ Haiku（分類・予算提案・支出クセ）

**使わない：** Zustand・Edge Function・Vercel Queue・状態管理ライブラリ

## 原則

- 業務ロジックは **API Routesのみ**。Supabaseは DB+Auth に徹する
- 状態管理：TanStack Query（サーバー）/ URL params（月・フィルター）/ useState（モーダル）
- モーダルが3階層を超えそうな場合は URL params（`?modal=xxx`）に逃がす
- また処理が完成したときは次の処理をおこなう指示を出すこと
- **絶対禁止：** `service_role_key` をフロント・API Routesで使用（anon keyのみ）

## ファイル参照ルール（重要）

タスクに応じて以下を読む。すべて読む必要はない。

| タスク | 参照ファイル |
|---|---|
| API Route実装 | `docs/api-conventions.md`（認証・命名・retry戦略） |
| AI機能実装 | `docs/ai-rules.md`（モデル選択・コスト管理・RAG圧縮） |
| Cron実装 | `docs/cron-monthly.md`（処理順序・依存関係） |
| DB操作・マイグレーション | `supabase/migrations/`（スキーマの正本） + `docs/db-notes.md` |
| テスト追加 | `docs/test-policy.md` |
| エラー対応 | `docs/troubleshooting.md` |

**コード規約・スタイル：** linter/formatter（ESLint・Prettier）に委ねる。CLAUDE.mdには書かない。

**フォールバック文言：** `src/lib/fallback-messages.ts` に集約。

**認証ガード：** 全APIルート冒頭で `await requireAuth(request)` を呼ぶ（`src/lib/api-guard.ts`）。

## テスト3点のみ

```
src/__tests__/score.test.ts        スコア計算・グレード境界値
src/__tests__/csv.test.ts          重複検知・source_hash生成
src/__tests__/category-rag.test.ts RAGヒット判定・normalizeKeyword
```

実行：機能完了時・他機能から影響を受ける変更時・Phase完了時。それ以外は書かない。

## 30分ルール

1. エラーをそのまま貼る（5分）
2. 「エラー + Next.js」でGoogle検索（10分）
3. 30分超えたら壁打ちチャットへ

RLSでデータが見えない時：Supabaseテーブルエディタで直接確認 → DBにある（フロント問題）/ ない（RLS問題）で切り分け。

## 現在のPhase

**Phase 2 / Week 11** — 取引編集削除・スコア永続化・月初Cron 完了

| Week | 内容 | 状態 |
|------|------|------|
| 1 | 環境構築（Next.js・Supabase・Vercel・Google OAuth） | ✅ |
| 2 | 取引CRUD基本 | ✅ |
| 3 | households / household_members / transactions新スキーマ | ✅ |
| 4 | categories テーブル | ✅ |
| 5 | CSV取込み（MF形式）＋MF自動取り込み（非公式API・Vercel Cron） | ✅ |
| 6 | AI分類（Haiku）・RAGキャッシュ | ✅ |
| 7 | 予算提案＋支出クセ（Haiku 統合呼び出し） | ✅ |
| 8 | 月次サマリー（Sonnet）・AIチャット | ✅ |
| 9 | ダッシュボードUI（月切替・AiSummaryCard・AiChatPanel） | ✅ |
| 10 | 予算ダッシュボード（BudgetDashboard・ScoreRing・BudgetSuggestCard・SpendingPatternCard） | ✅ |
| 11 | 取引編集・削除（PATCH/DELETE API + UI）・monthly_scoresマイグレーション・スコア計算ライブラリ・月初Cron | ✅ |
| 12 | Skeleton UI全画面適用・固定費管理UI・ダッシュボードにスコアカード追加 | 未 |

### Week 11 実装内容
- `supabase/migrations/20260515000013_monthly_scores.sql` — monthly_scores・fixed_expense_suggestions テーブル
- `lib/score-calculator.ts` — recalculateScore(supabase, householdId, month)
- `app/api/transactions/[id]/route.ts` — PATCH・DELETE（スコア再計算統合）
- `components/transactions/TransactionList.tsx` — ⋯メニュー・編集ダイアログ・削除確認ダイアログ追加
- `app/api/cron/monthly/route.ts` — 月初Cron（スコア確定・月次サマリー・予算提案・固定費検出・クリーンアップ）
- `vercel.json` — `/api/cron/monthly` schedule追加（毎月1日 00:01 JST）

### 次の指示
Week 12: **Skeleton UI全画面適用 + ダッシュボードにスコアカード追加**を実装してください。
- `components/ui/Skeleton.tsx` — shimmerアニメーションのSkeletonアトム（panel / line-sm / line-md / line-lg / block バリアント）
- `components/dashboard/ScoreCard.tsx` — monthly_scoresからスコアを取得して表示（TanStack Query）
- `app/page.tsx` — ScoreCardをAiSummaryCardの上に配置
- 各ページの isLoading 時に Skeleton を適用（BudgetDashboard は実装済み・他ページも統一）
