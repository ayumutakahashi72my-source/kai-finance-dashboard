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

### AI / LLM 機能
- **月次サマリー** — Sonnet が毎月の支出傾向をナラティブで要約
- **四半期深層分析** — Opus が四半期ごとに700〜1000字の詳細レポートを生成し `quarterly_insights` に保存
- **AIチャット** — 自分の取引履歴をコンテキストに質問できる対話UI
- **予算アドバイス** — Haiku が3ヶ月ローリング平均をもとにカテゴリ別予算を提案
- **支出異常検知** — 前3ヶ月平均との乖離が±30%以上のカテゴリを自動フラグ（`monthly_anomaly_flags`）
- **固定費自動検出** — 直近3ヶ月で3回以上同一 payee の支出を固定費候補として検出
- **AIコスト追跡** — モデル別トークン使用量を `ai_cost_logs` に記録、管理者ダッシュボードで日次コスト確認

### UI / UX
- モバイルファーストのレスポンシブレイアウト（ボトムナビ・シートモーダル）
- カレンダービュー（ヒートマップ付きカレンダーグリッド→タップでボトムシート展開、固定費・クレカ除外ヒートマップ）
- 収支画面（リスト/カレンダー切替・カテゴリフィルターチップス・日別グルーピング）
- 予算ダッシュボード（リングチャート・カテゴリドリルダウン・スコアカード）
- Filled SVGカスタムアイコン（約70種、Material Design風 — Lucide本番ビルド互換性問題の回避策）
- 全画面Skeleton UIによるローディング統一
- スワイプで閉じるボトムシート（ハンドルバー領域のみスワイプ反応、コンテンツスクロール独立）
- Web Push通知
- 管理者用イベントログ（クライアント・サーバーエラーの自動記録 + 閲覧UI）

---

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 14 App Router・TypeScript・Tailwind CSS・Recharts |
| データフェッチ | TanStack Query v5・Zod |
| バックエンド | Next.js API Routes（業務ロジック全集約） |
| データベース | Supabase（PostgreSQL + pgvector + RLS） |
| 認証 | Supabase Google OAuth |
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
    cron/
      monthly/   # 月初ロールアップ（スコア確定・サマリー・固定費検出・RAG decay）
      quarterly/ # 四半期深層分析（Opus）
    transactions/ # CRUD・CSV取込み・AI分類・OCR
    settings/    # MF連携・メンバー管理・通知設定

components/
  dashboard/     # サマリーカード・グラフ・AIパネル・ScoreCard
  budget/        # BudgetDashboard・ScoreRing・SpendingPatternCard
  transactions/  # 一覧・フィルター・CSV取込みダイアログ・レシートOCR
  calendar/      # カレンダーグリッド＋ヒートマップ＋ボトムシート
  ui/            # CategoryIcon（filled SVG）・Skeleton・共通UIコンポーネント
  kai/           # モバイル向けスクリーンラッパー

lib/
  ai-classifier.ts       # Haiku分類パイプライン（5段階フィルタリング）
  embedder.ts            # pgvector embedding + RAGルックアップ
  merchant-canonical.ts  # 店舗名表記ゆれ正規化（RAGキーミスマッチ対策）
  keyword-rules.ts       # インメモリキーワードルール（コスト0分類）
  category-icons.ts      # カテゴリ名→アイコン名マッピング（resolveIconName）
  ocr.ts                 # PP-OCRv5 + 3層RAGパイプライン
  score-calculator.ts    # 複合スコア計算
  event-logger.ts        # クライアント側イベントログ（バッチ送信・エラー即時flush）
  moneyforward-client.ts # MF非公式APIクライアント
  mf-browser.ts          # MFセッション用ヘッドレスブラウザ
  monthly-summary.ts     # Sonnetサマリー生成
  budget-advisor.ts      # Haiku予算提案
  cost-tracker.ts        # モデル別コスト記録
  hooks/
    use-swipe-dismiss.ts # スワイプで閉じるボトムシートフック
  supabase/
    server.ts            # 通常API Routes用クライアント（anon key + ユーザーセッション）
    admin.ts             # Cron専用adminクライアント（service_role key、RLSバイパス）

supabase/migrations/    # スキーマ変更履歴（マイグレーション46本）
docs/                   # API規約・AI設計ルール・DBメモ・テスト方針
__tests__/              # Vitestユニットテスト（スコア・CSV・RAG・RAGドリフト検知）
e2e/                    # Playwrightエンドツーエンドテスト
```

**主な設計方針：**
- 業務ロジックはAPI Routesに100%集約 — Supabaseはデータ/Auth専用、ブラウザから直接書き込みは行わない
- RAG分類はキーワード→embedding の2段階ルックアップでLLM呼び出しを削減（キャッシュヒット率 約80%）
- サーバー状態はTanStack Query、月/フィルター選択はURLパラメータ、モーダル開閉のみuseState
- Cronルートのみ `service_role` クライアント使用（CRON_SECRET 認証＋サーバー限定）、フロント・通常API Routesは anon key のみ

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
`push_subscriptions` → `notifications` → `api_error_logs` → `chat_histories` → `household_invites` → `event_logs`

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
npm run test:e2e      # Playwright E2Eテスト
npm run coverage      # カバレッジレポート（e2e/は除外）
```

テストスイート：スコア計算境界値・CSV重複検知・RAGヒット判定・RAGドリフト検知・AIコスト回帰・OCR。

---

## CI/CD

**ローカル（pre-pushフック）:** Husky v9 でpush前に typecheck・lint・ユニットテストを自動実行。  
**GitHub Actions:** push時にlint・型検査・Vitestを実行。  
**Vercel:** PR時にプレビューデプロイ、`main`マージで本番デプロイ。  
Vitest と Playwright が同一リポジトリに共存するため `vitest.config.ts` の `exclude: ['e2e/**']` で分離。

---

## 開発の流れ

週次スプリント12週間で、基本CRUDからAI統合・OCR・本番グレードダッシュボードまでインクリメンタルに構築。  
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
| 11 | 取引編集・削除（PATCH/DELETE API + UI）・月次スコア永続化・月初Cron（スコア確定・サマリー・予算提案・固定費検出・RAG decay・異常検知） |
| 12 | Skeleton UI全画面適用・レシートOCR（PP-OCRv5 + 3層RAG）・ScoreCard・四半期Cron（Opus深層分析）・Supabaseセキュリティ強化 |
| 13 | イベントログシステム・Filled SVGアイコン（本番クラッシュ修正）・カレンダーUX改善・収支画面UI簡素化（カテゴリタブ廃止）・pre-pushフック導入 |

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

この結果、Haiku呼び出しを約80%削減できた。

### RAGが「動いているように見えて実はLLMを呼んでいた」問題

pgvector を使った類似検索を実装したが、しばらく運用していると **RAGキャッシュのヒット率が0%** に近い状態が続いていた。原因を調べると：

- `normalizeKeyword()` 関数を途中で改修（法人格の除去・サフィックス削除ルールを追加）したことで、DB に保存済みの `payee_key` と新規取引の `payee_key` が一致しなくなっていた
- 結果として「キャッシュに存在するはずの取引」も全てHaikuに流れており、コスト削減効果がゼロになっていた

修正として `canonicalizeMerchant()` 層を追加し、`normalizeKeyword` の出力をさらに意味的に正規化（「セブンイレブン渋谷店」「セブンイレブン新宿三丁目」→ 同一キー）してからハッシュを生成することで、表記ゆれによるキャッシュミスを防いだ。

この経験から、**RAG系の変更は既存のembedding全体に影響する** ことを学び、`normalizeKeyword` の出力スナップショットをテストで固定し、5%以上変化した場合はCIで検出する仕組みを入れた（`__tests__/rag-drift.test.ts`）。

### RAGキャッシュの陳腐化問題

当初、`category_rag` のエントリは一度書き込まれると永続していた。ユーザーの支出習慣が変わると「昔の分類」が正しく機能しなくなる。

対処として2つの仕組みを導入した：
1. **自然減衰**: 月初Cronで `confidence × 0.95` を全エントリに適用。長期間ヒットしないエントリは信頼度が下がりLLMに回るようになる
2. **修正履歴の昇格**: ユーザーが同じpayeeのカテゴリを3回以上修正すると、月初CronがそのパターンをRAGに書き込み（または上書き）。ユーザーの修正が自動でキャッシュに反映される

### OCRと3層RAGの組み合わせ

レシートOCRの実装では、PP-OCRv5（ONNX）で画像からテキストを取得した後、カテゴリ推定にどのLLMを使うかが問題だった。

OCRは同一レシートでも複数枚撮影されることがあり、毎回Haikuを呼ぶとコストが積み上がる。そこで `ocr_store_cache`（店舗名→カテゴリ）を新設し、同じ店舗名が来たらキャッシュを返す仕組みにした。キャッシュミス時のみHaikuを呼び、結果をキャッシュに書き戻す。

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

```typescript
// Cron専用 — フロント・通常APIでは絶対に使わない
export function createAdminClient() {
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
```

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

### Supabase Security Advisor 警告の一括対応

本番運用開始後、Supabase Security Advisorが複数の警告を検出した。主な問題と対処：

**`function_search_path_mutable`（全ストアドファンクション）**  
`SECURITY DEFINER` 関数に `SET search_path` が未設定だと、攻撃者が `search_path` を操作して別のスキーマの関数を差し込める。全関数を `SET search_path = ''` で再作成し、テーブル参照を `public.` 修飾に統一した。ベクトル演算（`<=>`）は `public` スキーマに依存するため、該当関数のみ `SET search_path = 'public'` とした。

**`anon_security_definer`（`get_household_members_with_email` など）**  
`REVOKE FROM anon` では不十分であることが判明。`anon` ロールは `PUBLIC` を継承するため、`PUBLIC` への GRANT が残っていると anon からも実行できる。`REVOKE ALL FROM PUBLIC` の後に必要なロールへ明示的に `GRANT` する手順に修正した。

**`decay_category_rag_confidence` の過剰権限**  
マイグレーション019で `GRANT TO authenticated` が付与されており、ログイン済みユーザーが任意の世帯の confidence を減衰できる状態だった。`REVOKE FROM authenticated` の後 `GRANT TO service_role` に変更し、Cron（service_role）からのみ呼び出せるようにした。

**`api_error_logs` INSERT ポリシーの過剰許可**  
`WITH CHECK (true)` のため、ログイン済みであれば他世帯の `household_id` でログを書き込めた。自分が所属する世帯 ID のみ許可するポリシーに修正した。

### Lucide Reactの本番ビルドクラッシュ

開発環境では問題なく動いていたLucide Reactアイコンが、**Vercelの本番ビルドでのみ `getCategoryIcon(...) is not a function` でクラッシュ**する問題が発生した。

原因：Lucide Reactのアイコンコンポーネントは `forwardRef` でラップされている。`getCategoryIcon()` がコンポーネント参照を返し、それを `createElement()` で呼び出す設計だったが、本番ビルドのminification・tree-shakingにより `forwardRef` の内部構造が変わり、関数として呼び出せなくなっていた。

解決：Lucide React への依存を完全に排除し、**約70種のfilled SVGアイコンをカスタムコンポーネント（`CategoryIcon.tsx`）として直接実装**した。Material Design風の塗りつぶしアイコンを `<svg fill={color}>` で描画し、`resolveIconName()` でカテゴリ名→アイコン名のマッピングを行う設計に変更。ライブラリの内部実装に依存しない安定した構造になった。

### Supabase RLSのデバッグが難しかった問題

「データが表示されない」バグが何度か発生し、その都度「フロントのクエリが間違っているのか、RLSが弾いているのか」の切り分けに時間がかかった。

対処法として定めたルール：Supabaseのテーブルエディタで直接データを確認し、**DBにある → フロント問題 / ない → RLS問題** と切り分けてから調査する。`service_role_key` でRLSをバイパスするデバッグは絶対にしない（本番に混入するリスクがあるため）。
