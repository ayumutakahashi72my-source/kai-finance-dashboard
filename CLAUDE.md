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

<!-- 実装開始時に更新 -->
**Phase 1 / Week 1** — 環境構築（Next.js・Supabase dev/prod・Vercel空デプロイ・Google OAuth）
完了条件：VercelにデプロイされたページがHTTPSで開く
