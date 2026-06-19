# KAI 家計簿アプリ — プロダクト監査・設計資料

> 対象コードベース: `kai-finance-dashboard/kai-finance-dashboard`  
> 調査日: 2026-06-17  
> 根拠: 実コードから抽出（推測なし）

---

## Phase 1: プロダクト監査

---

### 1. 全機能一覧

```
支出管理
├ 手入力（ManualEntryTab）— 1件ずつ素早く記録
├ 編集（PATCH /api/transactions/[id]）
├ 削除（DELETE /api/transactions/[id]）
└ 一括削除（DELETE /api/transactions/bulk-delete）

データ取込
├ レシートOCR読取
│   ├ カメラ撮影（ReceiptCapture.tsx）
│   ├ PP-OCRv5 + sharp によるOCR解析（lib/ocr/pipeline.ts）
│   ├ 3層RAGパイプライン（rules→store_cache→Haiku）
│   └ OCRキャッシュ（ocr_store_cache テーブル）
├ CSV取込
│   ├ MoneyForward Me 形式（csv-parser.ts）
│   └ 重複検知（source_hash / DuplicateChecker.tsx）
└ MoneyForward Me 自動連携
    ├ 毎朝6:00 Vercel Cron 自動取込（/api/cron/mf-import）
    ├ 設定画面（/settings/integrations/mf）
    └ 同期ログ確認（MfSyncLogs.tsx）

AI分類
├ 自動分類パイプライン（ai-classifier.ts）
│   ├ ① キーワードルール（keyword-rules.ts）— 無料・即座
│   ├ ② 完全一致キャッシュ（category_rag テーブル）— 高速・無料
│   ├ ③ ベクター検索 direct（embedder.ts）— 中速・安価
│   ├ ④ ベクター検索 rerank — 中速・安価
│   └ ⑤ AI分類 Haiku（llm_full / llm_freeform）— 有料
├ 類似検索（RAG / category_rag テーブル）
├ 手動修正フィードバック（category_corrections テーブル）
└ ユーザーカテゴリ知識蓄積（user_category_knowledge テーブル）

ダッシュボード（/ ホーム）
├ NOW タブ
│   ├ 異常支出バナー（AnomalyBanner）
│   ├ カテゴリドーナツチャート（CategoryRingHero — モバイル）
│   ├ 目標進捗カード（GoalProgressCard）
│   ├ カテゴリチップ 2×2 グリッド
│   ├ 支出/収入比率カード（DashKpiRow）
│   └ デスクトップKPI 4枚 + トレンドチャート + 最近の取引
├ 分析タブ
│   ├ 月次トレンドチャート（Recharts）
│   ├ カテゴリ別内訳
│   └ 月次比較
└ AI戦略タブ
    ├ 月次AIサマリー（AiSummaryCard）
    ├ 四半期インサイト（QuarterlyInsightCard）
    └ AIチャット（AiChatPanel — Sonnet）

収支一覧（/transactions）
├ 月次フィルター
├ 支出/収入フィルター
├ カテゴリフィルター
├ テキスト検索
└ 取引編集・削除

カレンダー（/calendar）
├ 月次カレンダーグリッド
├ 日別支出ヒートマップ
└ 日タップで取引詳細

予算管理（/budget）
├ キャッシュフローカード（CashflowCard）
├ 貯蓄率トラッカー（SavingsRateTracker）
├ 予算ダッシュボード（BudgetDashboard）— カテゴリ別予算 vs 実績
├ 固定費カード（FixedExpenseCard）
└ カテゴリ別詳細ドリル（/budget/category/[name]）

AI分析・サマリー（/summary）
├ AIチャット（AiChatPanel — 常時展開 / Sonnet）
└ 月次サマリー詳細（SummaryContent — 折りたたみ）

目標管理（/settings/goals）
├ 貯蓄目標設定
└ 月次予算AIアドバイス

カテゴリ管理（/settings/categories）
├ カテゴリ作成・編集・削除
└ 親カテゴリ階層設定

通知（/settings/notifications）
└ PWAプッシュ通知設定（月次レポート）

世帯・メンバー管理
├ 世帯作成（CreateHouseholdForm）
├ メンバー招待（/api/settings/members/invite → トークンURL）
├ 招待受諾（/invite/[token]）
└ 世帯脱退（LeaveHouseholdButton）

MoneyForward連携（/settings/integrations/mf）
├ 認証情報設定
└ 手動同期実行

AI修正フィードバック（/settings/corrections）
└ 過去のAI分類修正履歴一覧

管理者機能（/admin/analytics — 管理者専用）
├ AI運用分析ダッシュボード
│   ├ RAG学習状況（学習済み店舗数・高信頼店舗数・LLM削減率）
│   ├ システム健全度サマリー
│   ├ 分類メソッド内訳（7種類）
│   ├ 分類精度テスト結果（Golden Dataset）
│   ├ 過去30日間トレンドチャート
│   ├ キャッシュ成長曲線（週次）
│   ├ 長期トレンド（日次スナップショット）
│   ├ 要対応ログ（低精度・失敗）
│   ├ 改善優先度ランキング（店舗）
│   ├ カテゴリ別分類精度スコア
│   └ AIコスト内訳（30日間・モデル別・機能別）
└ AI改善提案（Haiku による自動生成）

管理者 — メンバー権限（/settings/admin/members）
└ 世帯メンバーの管理者権限変更

メンテナンス（管理者のみ）
├ カテゴリカラー修正（FixCategoryColorsButton）
└ カードカード振替クリーンアップ（CleanupCardTransfersButton）

法規ページ（/legal）
├ プライバシーポリシー
├ 利用規約
├ Cookieポリシー
└ データ取扱い

認証
├ Googleログイン（OAuth）
├ デモアカウント（/api/auth/demo）
└ コールバック処理（/auth/callback）

PWA
├ Web App Manifest（app/manifest.ts）
├ Service Worker（public/sw.js）
├ インストールバナー（InstallBanner.tsx）
└ プッシュ通知購読（/api/push/subscribe）

Cron（自動実行）
├ 毎朝 6:00 MF自動取込（/api/cron/mf-import）
├ 毎月1日 月次サマリー生成（/api/cron/monthly）
├ 四半期サマリー（/api/cron/quarterly）
├ 日次ヘルスチェック（/api/cron/health-snapshot）
└ デモデータリセット（/api/cron/demo-reset）
```

---

### 2. 全画面一覧

| 画面名 | URL | 目的 | 対象ユーザー |
|--------|-----|------|-------------|
| ホーム（ダッシュボード） | `/` | 今月の支出・収入サマリー、AI戦略、分析 | 一般 |
| 収支一覧 | `/transactions` | 取引履歴の閲覧・検索・フィルター・編集 | 一般 |
| カレンダー | `/calendar` | 日別支出カレンダー表示 | 一般 |
| AI分析・チャット | `/summary` | AIチャット + 月次サマリー | 一般 |
| 予算管理 | `/budget` | 予算 vs 実績・固定費・貯蓄率 | 一般 |
| カテゴリ詳細 | `/budget/category/[name]` | カテゴリ別取引一覧ドリルダウン | 一般 |
| 設定 | `/settings` | 各種設定へのハブ画面 | 一般 |
| カテゴリ管理 | `/settings/categories` | カテゴリCRUD | 一般 |
| 目標管理 | `/settings/goals` | 貯蓄目標・月次予算設定 | 一般 |
| AI修正フィードバック | `/settings/corrections` | 分類修正履歴 | 一般 |
| 通知設定 | `/settings/notifications` | プッシュ通知のON/OFF | 一般 |
| MF連携設定 | `/settings/integrations/mf` | MoneyForward認証設定 | 一般（非デモ） |
| MF連携設定（旧） | `/settings/mf` | ← 重複・廃止候補 | — |
| AI運用分析 | `/admin/analytics` | 分類精度・コスト・RAG状態の監視 | 管理者 |
| メンバー権限管理 | `/settings/admin/members` | 世帯メンバーの管理者権限変更 | 管理者 |
| ログイン | `/login` | Googleログイン / デモ | 未認証 |
| 招待受諾 | `/invite/[token]` | 招待URLから世帯に参加 | 未認証 |
| プライバシーポリシー | `/legal/privacy` | 法的情報 | 全ユーザー |
| 利用規約 | `/legal/terms` | 法的情報 | 全ユーザー |
| Cookieポリシー | `/legal/cookie` | 法的情報 | 全ユーザー |
| データ取扱い | `/legal/data` | 法的情報 | 全ユーザー |
| カテゴリ | `/categories` | ※独立ページとして存在するが設定と重複 | 要確認 |

---

### 3. ナビゲーション一覧

#### Bottom Navigation（モバイル / `lg:hidden`）

```
[ホーム] [カレンダー]  [+FAB]  [収支] [AI]
   /         /calendar          /transactions /summary
```

- 中央に追加FABボタン（AddPickerSheet を開く）
- 予算管理（`/budget`）はBottomNavに**存在しない**

#### Sidebar（デスクトップ / `lg:flex`）

```
KAI ロゴ
─────────
ダッシュボード  /
収支            /transactions
カレンダー      /calendar
AIサマリー      /summary
─────────
[取り込む] ボタン（AddPickerSheet）
─────────
世帯バッジ + テーマトグル
```

- 予算管理（`/budget`）がSidebarに**存在しない**
- 設定・管理者への導線がSidebarに**存在しない**

#### AddPickerSheet（モーダルシート）

```
支出を追加
├ 手入力（manual）
├ レシート読取（receipt）← デモでは非表示
├ CSV取込（csv）
└ MoneyForward連携（mf）← デモでは非表示
```

#### 設定ページ内導線

```
設定（/settings）
├ データ
│   ├ カテゴリ管理 → /settings/categories
│   ├ 目標管理 → /settings/goals
│   └ AI修正フィードバック → /settings/corrections
├ 通知
│   └ 通知設定 → /settings/notifications
├ 連携（非デモのみ）
│   └ MoneyForward連携 → /settings/integrations/mf
├ 管理者（管理者・デモのみ）
│   ├ AI分析 → /admin/analytics
│   └ メンバー権限管理 → /settings/admin/members
└ メンテナンス（管理者のみ）
    ├ カテゴリカラー修正
    ├ カード振替クリーンアップ
    └ 世帯脱退
```

#### ProfileDropdown（ヘッダー右）

- 全画面のヘッダーに存在。ログアウト・設定への主要な導線。

---

### 4. API一覧

| API名 | Method | パス | 用途 | 利用箇所 |
|-------|--------|------|------|---------|
| 取引一覧/作成 | GET/POST | `/api/transactions` | 取引CRUD | TransactionsView, actions |
| 取引更新/削除 | PATCH/DELETE | `/api/transactions/[id]` | 個別取引操作 | TransactionList |
| 取引一括削除 | DELETE | `/api/transactions/bulk-delete` | 複数選択削除 | TransactionsView |
| AI分類（一括） | POST | `/api/transactions/classify` | CSV取込後に一括分類 | CsvImportTab |
| AI分類（1件） | POST | `/api/transactions/classify-one` | 手入力後に単独分類 | ManualEntryTab |
| OCR解析 | POST | `/api/transactions/ocr` | レシート画像→取引データ | ReceiptCapture |
| CSV取込 | POST | `/api/transactions/import/csv` | CSVファイルの一括取込 | CsvImportTab |
| 重複チェック | GET | `/api/transactions/duplicates` | 重複取引の検出 | DuplicateChecker |
| カード振替クリーン | POST | `/api/transactions/cleanup-card-transfers` | カード引落の重複除去 | CleanupCardTransfersButton |
| カテゴリ一覧/作成 | GET/POST | `/api/categories` | カテゴリ管理 | CategoryList |
| 予算一覧/更新 | GET/POST | `/api/budgets` | 月次予算設定 | BudgetDashboard |
| 予算提案 | POST | `/api/budget/suggest` | AI予算提案（Haiku） | BudgetSuggestCard |
| キャッシュフロー | GET | `/api/cashflow` | 月次収支データ | CashflowCard |
| 目標一覧/作成 | GET/POST | `/api/goals` | 貯蓄目標管理 | GoalProgressCard |
| 目標更新/削除 | GET/PATCH/DELETE | `/api/goals/[id]` | 個別目標操作 | GoalsPage |
| 目標計算 | POST | `/api/goals/[id]/calculate` | 達成予測計算 | GoalsPage |
| 固定費一覧 | GET | `/api/fixed-expenses` | 固定費サジェスト取得 | FixedExpenseCard |
| 異常検知 | GET | `/api/anomalies` | 異常支出フラグ | AnomalyBanner |
| スコア | GET | `/api/scores` | 月次スコア取得 | ScoreCard（DashboardTabs） |
| AIサマリー | GET | `/api/ai/summary` | 月次AIサマリー生成（Sonnet） | AiSummaryCard |
| AIチャット | POST | `/api/ai/chat` | AIチャット（Sonnet） | AiChatPanel |
| AI四半期 | GET | `/api/ai/quarterly` | 四半期インサイト生成 | QuarterlyInsightCard |
| 通知購読 | POST | `/api/push/subscribe` | プッシュ通知登録 | NotificationToggle |
| 通知解除 | POST | `/api/push/unsubscribe` | プッシュ通知解除 | NotificationToggle |
| フィードバック | POST | `/api/feedback` | アプリフィードバック送信 | 未確認 |
| MF設定 | GET/POST | `/api/settings/mf` | MF認証情報の保存 | MfSettingsForm |
| MF同期 | POST | `/api/settings/mf/sync` | 手動MF同期実行 | MfSyncTab |
| MFログ | GET | `/api/settings/mf/logs` | MF同期ログ取得 | MfSyncLogs |
| メンバー一覧/追加 | GET/POST | `/api/settings/members` | 世帯メンバー管理 | MembersPage |
| メンバー招待 | POST | `/api/settings/members/invite` | 招待メール送信 | MembersPage |
| 世帯脱退 | POST | `/api/settings/household/leave` | 世帯から脱退 | LeaveHouseholdButton |
| カラー修正 | POST | `/api/settings/categories/fix-colors` | カテゴリ色の一括修正 | FixCategoryColorsButton |
| 招待受諾 | GET/POST | `/api/invite/[token]` | 招待トークン検証・参加 | AcceptPanel |
| 管理者分析 | GET | `/api/admin/analytics` | AI分類統計・コスト | AdminAnalyticsPage |
| 管理者AI提案 | POST | `/api/admin/analytics/insight` | Haikuによる改善提案生成 | AdminAnalyticsPage |
| Cronデモリセット | POST | `/api/cron/demo-reset` | デモデータリセット | Vercel Cron |
| Cronヘルス | POST | `/api/cron/health-snapshot` | 日次統計スナップショット | Vercel Cron |
| CronMF取込 | POST | `/api/cron/mf-import` | MF自動取込 | Vercel Cron |
| Cron月次 | POST | `/api/cron/monthly` | 月次サマリー生成 | Vercel Cron |
| Cron四半期 | POST | `/api/cron/quarterly` | 四半期インサイト生成 | Vercel Cron |
| デモログイン | POST | `/api/auth/demo` | デモアカウントログイン | LoginPage |
| 認証コールバック | GET | `/auth/callback` | Supabase OAuth処理 | Supabase |

---

### 5. DB利用一覧

| テーブル名 | 用途 | 主な利用画面 | 更新 |
|-----------|------|------------|------|
| `transactions` | 収支取引データ（中核） | 全画面 | ○ |
| `categories` | 支出カテゴリ定義 | ダッシュボード・設定 | ○ |
| `households` | 世帯情報 | 全画面（認証） | ○ |
| `household_members` | 世帯メンバー・権限 | 設定・管理者 | ○ |
| `household_invites` | 招待トークン管理 | 招待フロー | ○ |
| `budgets` | 月次予算設定 | 予算管理 | ○ |
| `budget_suggestions` | AI予算提案キャッシュ | 予算管理 | ○ |
| `category_rag` | AI分類RAGキャッシュ（学習データ） | AI分類全般 | ○ |
| `category_corrections` | ユーザー手動修正履歴 | 修正フィードバック設定 | ○ |
| `user_category_knowledge` | ユーザー別カテゴリ知識 | AI分類 | ○ |
| `merchant_embedding_cache` | 店舗名埋め込みベクターキャッシュ | AI分類（ベクター検索） | ○ |
| `ocr_store_cache` | OCR店舗認識キャッシュ | レシートOCR | ○ |
| `ai_classification_logs` | AI分類ログ（精度・レイテンシ） | 管理者分析 | ○（自動） |
| `ai_cost_logs` | AIコストログ | 管理者分析 | ○（自動） |
| `ai_health_snapshots` | 日次ヘルスチェックスナップショット | 管理者分析 | ○（Cron） |
| `ai_insights_embeddings` | AIインサイト埋め込み | AI分析 | ○ |
| `monthly_scores` | 月次家計スコア | ダッシュボード（ScoreCard） | ○（Cron） |
| `monthly_summaries` | 月次AIサマリーキャッシュ | /summary・ダッシュボード | ○（生成時） |
| `quarterly_insights` | 四半期インサイトキャッシュ | ダッシュボード | ○（Cron） |
| `monthly_anomaly_flags` | 異常支出フラグ | AnomalyBanner | ○（Cron） |
| `financial_goals` | 貯蓄目標 | 目標管理・ダッシュボード | ○ |
| `fixed_expense_suggestions` | 固定費サジェスト | 予算管理 | ○（Cron） |
| `chat_sessions` | AIチャットセッション | /summary | ○ |
| `chat_messages` | AIチャットメッセージ | /summary | ○ |
| `mf_sync_logs` | MF同期ログ | 設定 | ○（自動） |
| `push_subscriptions` | PWAプッシュ通知購読 | 通知設定 | ○ |
| `notifications` | 通知レコード | 通知 | ○ |
| `user_settings` | ユーザー設定（テーマ等） | 設定 | ○ |
| `api_error_logs` | APIエラーログ | 管理者（内部） | ○（自動） |

---

### 6. コンポーネント一覧

| 名称 | 利用箇所 | 責務 |
|------|---------|------|
| `BottomBar` | 全画面 | モバイル用ナビゲーション（4項目+FAB） |
| `Sidebar` | 全画面 | デスクトップ用ナビゲーション |
| `AddPickerSheet` | Sidebar・BottomBar | 支出追加方法選択シート（4種） |
| `ManualEntryTab` | AddPickerSheet | 手入力フォーム |
| `CsvImportTab` | AddPickerSheet | CSV取込フォーム |
| `MfSyncTab` | AddPickerSheet | MF手動同期UI |
| `ReceiptCapture` | AddPickerSheet | カメラ撮影・OCR起動 |
| `ReceiptAnalyzingV2` | AddPickerSheet | OCR解析中UI |
| `ProfileDropdown` | 全画面ヘッダー | プロフィール・ログアウト |
| `DashboardTabs` | ホーム | NOW/分析/AI戦略タブ切替 |
| `NowTab` | ダッシュボード | 今月サマリー（モバイル+デスクトップ） |
| `AnalyticsTab` | ダッシュボード | 分析チャート（lazy load） |
| `AiSummaryCard` | ダッシュボード・/summary | 月次AIサマリー表示 |
| `AiChatPanel` | ダッシュボード・/summary | AIチャットUI（Sonnet） |
| `QuarterlyInsightCard` | ダッシュボード | 四半期インサイト |
| `AnomalyBanner` | ダッシュボード | 異常支出警告バナー |
| `GoalBanner` | ダッシュボード | 目標未設定時のバナー |
| `GoalProgressCard` | ダッシュボード | 目標進捗カード |
| `MonthSwitcher` | 全主要画面 | 月切替コントロール |
| `SummaryContent` | /summary | 月次サマリー詳細（折りたたみ） |
| `TransactionsView` | /transactions | 取引一覧ビュー（フィルター含む） |
| `TransactionList` | TransactionsView | 取引リスト表示 |
| `TransactionFilters` | TransactionsView | 検索・フィルターUI |
| `DuplicateChecker` | CSV取込フロー | 重複取引検出UI |
| `BudgetDashboard` | /budget | カテゴリ別予算管理 |
| `CashflowCard` | /budget | キャッシュフロー表示 |
| `SavingsRateTracker` | /budget | 貯蓄率追跡 |
| `FixedExpenseCard` | /budget | 固定費サジェスト表示 |
| `BudgetSuggestCard` | /budget | AI予算提案 |
| `SpendingPatternCard` | /budget | 支出傾向分析 |
| `CategoryTransactionDrawer` | /budget/category/[name] | カテゴリ別取引ドロワー |
| `CalendarView` | /calendar | カレンダーグリッドUI |
| `CategoryList` | /settings/categories | カテゴリ管理リスト |
| `MfSettingsForm` | /settings/integrations/mf | MF認証フォーム |
| `MfSyncLogs` | /settings/integrations/mf | MF同期ログ表示 |
| `CorrectionHistory` | /settings/corrections | 分類修正履歴 |
| `NotificationToggle` | /settings/notifications | プッシュ通知切替 |
| `LeaveHouseholdButton` | /settings | 世帯脱退ボタン |
| `CleanupCardTransfersButton` | /settings | カード振替クリーンアップ |
| `FixCategoryColorsButton` | /settings | カテゴリカラー修正 |
| `CreateHouseholdForm` | ホーム（初回） | 世帯作成フォーム |
| `InstallBanner` | 全画面 | PWAインストール促進 |
| `CategoryIcon` | 取引表示全般 | カテゴリアイコン描画 |
| `Skeleton` | ローディング全般 | スケルトンUI |
| `providers.tsx` | ルートレイアウト | TanStack Query・PWA SW登録 |

---

### 7. 未使用コード一覧（削除候補）

#### 確実に削除可能

| 対象 | 種別 | 理由 |
|------|------|------|
| `public/kai-sw.js` | ファイル | `public/sw.js`と完全同一、未登録 |
| `public/models/det.onnx` | ファイル | 0バイト空ファイル、旧OCRモデル |
| `extract_pdf.mjs` | スクリプト | 一時作業ツール、法規ページ更新済み |
| `scripts/generate-splash.ts` | スクリプト | スプラッシュ画像生成済み、CI未使用 |
| `scripts/download-ocr-models.ts` | スクリプト | モデルはコミット済み |
| `lib/supabase.ts` | ファイル | re-exportラッパーだが誰も使用していない |

#### 要確認（削除候補）

| 対象 | 種別 | 理由 |
|------|------|------|
| `app/settings/mf/page.tsx` | ページ | `/settings/integrations/mf`の旧バージョン |
| `components/kai/shared/index.tsx` | コンポーネント群 | パス解決で`shared.tsx`が優先され実質未使用 |
| `components/categories/CategoryList.tsx` | コンポーネント | `/categories` ページとの関係が不明 |
| `app/categories/page.tsx` | ページ | 設定のカテゴリ管理との重複の可能性 |

#### ESLint警告（未使用import・変数）

`app/page.tsx`、`app/calendar/page.tsx`、`components/budget/CategoryTransactionDrawer.tsx` など計11ファイル・41件

---

## Phase 2: プロダクトレビュー

---

### ユーザー種別分類

| 機能 | 一般利用者 | 管理者 | 開発者 |
|------|-----------|--------|--------|
| ダッシュボード | ✓ | ✓ | ✓ |
| 収支一覧 | ✓ | ✓ | ✓ |
| カレンダー | ✓ | ✓ | |
| AI分析・チャット | ✓ | ✓ | |
| 予算管理 | ✓ | ✓ | |
| カテゴリ管理 | ✓ | ✓ | |
| 目標管理 | ✓ | ✓ | |
| 通知設定 | ✓ | ✓ | |
| MF連携 | ✓（非デモ） | ✓ | |
| AI運用分析 | | ✓ | ✓ |
| メンバー権限管理 | | ✓ | |
| メンテナンスツール | | ✓ | ✓ |

---

### 利用頻度推定

| 機能 | 頻度 | 根拠 |
|------|------|------|
| AddPickerSheet（取引追加） | **毎日** | 家計管理の核 |
| ホーム NOW タブ | **毎日** | 起動時の最初の画面 |
| 収支一覧 | **毎日〜週次** | 確認・編集ニーズ |
| カレンダー | 週次 | 日別振り返り |
| AI分析・チャット | 週次 | 相談・サマリー確認 |
| 予算管理 | 週次〜月次 | 予算 vs 実績チェック |
| 目標管理設定 | 月次 | 目標値の調整 |
| MF同期（手動） | 月次 | CSVや手動補完 |
| AI運用分析 | 月次（管理者） | コスト・精度確認 |
| 通知設定 | ほぼ利用しない | 初期設定のみ |
| 法規ページ | ほぼ利用しない | 初期確認のみ |
| メンテナンスツール | ほぼ利用しない | トラブル時のみ |

---

### UXレビュー

#### 問題1: ナビゲーションの不整合

```
現状:
  BottomBar: ホーム / カレンダー / 収支 / AI  ← 4項目
  Sidebar:   ダッシュボード / 収支 / カレンダー / AIサマリー  ← 4項目

問題:
  ・「予算管理」が両方の主ナビに存在しない（設定からしかたどり着けない）
  ・「設定」がSidebarにない（ProfileDropdownからしか到達不明）
  ・モバイルとデスクトップでナビラベルが一部異なる（「AI」vs「AIサマリー」）
```

#### 問題2: 情報過多 — ホーム画面の責務分散

```
ホーム（/）の DashboardTabs が持つ責務:
  - NOW タブ: 支出/収入KPI・カテゴリドーナツ・目標進捗・異常警告
  - 分析タブ: トレンドチャート・月次比較
  - AI戦略タブ: 月次サマリー・四半期インサイト・AIチャット

問題:
  ・「AIチャット」は /summary にも単独ページとして存在（重複）
  ・「分析」タブと「予算管理」ページの役割が重複
  ・タブ名「AI戦略」が何をするか直感的でない
```

#### 問題3: 予算管理ページへの導線断絶

```
/budget は:
  ・BottomBarにリンクなし
  ・Sidebarにリンクなし
  ・ホームから到達する明示的なボタンなし
  → ブラウザの直接入力かProfileDropdown経由のみ（要確認）
```

#### 問題4: AIチャットの重複配置

```
AIチャット（AiChatPanel）が:
  ・ホームの「AI戦略」タブ内
  ・/summary ページ（常時展開）
  の2箇所に存在 → どちらが正式か不明確
```

#### 問題5: 設定ページへの導線が不明瞭

```
設定（/settings）への到達手段:
  ・ProfileDropdown内（全画面のヘッダー右の小さいアバターアイコン）
  ・BottomBar・Sidebarに明示ボタンなし
  → 設定の入口が1箇所のみで発見困難
```

#### 問題6: MF設定ページの重複

```
/settings/mf （旧）と /settings/integrations/mf （新）が並存
（DEAD_CODE_REPORTでも指摘済み）
```

#### 問題7: カレンダーと収支一覧の重複感

```
/calendar と /transactions は別ページだが、
どちらも「月の支出を見る」用途で重複感がある
```

#### 問題8: デモアカウントの機能制限に説明なし

```
デモアカウントでは「レシート読取」「MF連携」が非表示になるが、
その旨の説明UIが存在しない
```

---

## Phase 3: ユーザーフロー分析

---

### 主要フロー: レシート撮影 → 保存

```
[BottomBar中央FAB / Sidebar「取り込む」]
        ↓
AddPickerSheet（Picker ステップ）
        ↓「レシート読取」を選択
ReceiptCapture（カメラ起動 / 画像選択）
        ↓撮影・選択
ReceiptAnalyzingV2（OCR解析中UI）
        ↓解析完了（payee / amount / occurred_on を抽出）
ManualEntryTab（OcrPrefill で項目を自動入力）
        ↓内容確認・カテゴリ選択・金額調整
POST /api/transactions（保存）
        ↓
AddPickerSheet クローズ → ホームへ遷移
        ↓
ホームのNOWタブで最新状態を確認

断点・リスク:
  ① OCR精度が低い場合は手動で全フィールドを修正する必要がある
  ② カテゴリが未分類の場合、手動選択が必要
  ③ デモアカウントでは「レシート読取」ボタン自体が非表示
```

### 主要フロー: CSV取込 → 確認 → 保存

```
[AddPickerSheet → CSV取込]
        ↓
CsvImportTab（ファイル選択）
        ↓
csv-parser.ts でパース（MF形式）
        ↓
DuplicateChecker（重複確認UI）
        ↓「取り込む」
POST /api/transactions/import/csv
        ↓（バックグラウンドでAI分類が走る）
POST /api/transactions/classify
        ↓
/transactions ページへ遷移
        ↓
収支一覧で分類結果を確認・修正
```

### 主要フロー: MoneyForward 自動連携

```
毎朝 6:00（Vercel Cron）
        ↓
GET /api/cron/mf-import
        ↓
moneyforward-client.ts が全口座データ取得
        ↓
取引データを transactions テーブルに保存
        ↓
AI分類パイプライン実行（classify）
        ↓
翌朝ユーザーがホームを開くと最新データが表示
```

### 主要フロー: 月次振り返り（月1回）

```
[月初にCron: /api/cron/monthly 自動実行]
        ↓
月次サマリー生成（Sonnet）→ monthly_summaries に保存
月次スコア計算 → monthly_scores に保存
異常検知 → monthly_anomaly_flags に保存
        ↓
ユーザーがホーム「AI戦略」タブを開く
        ↓
AiSummaryCard で月次サマリー表示
        ↓（必要に応じて）
AIチャットで詳細を相談 → /summary へ
        ↓
予算管理（/budget）で次月の予算を調整
```

---

## Phase 4: 情報設計（IA）

---

### 新サイトマップ（機能削除なし・再整理版）

```
KAI
├── ホーム（/）
│   ├── 今月サマリー（収支・カテゴリ・異常警告）
│   ├── 目標進捗
│   └── 連続記録（ストリーク）
│
├── 支出記録（FAB / +ボタン）← 専用ページ不要、どこからでも起動
│   ├── 手入力
│   ├── レシート読取（OCR）
│   ├── CSV取込
│   └── MoneyForward連携
│
├── 収支（/transactions）
│   ├── 月次フィルター・検索
│   ├── 取引リスト
│   └── カレンダービュー（/calendar）← 収支のサブビュー化を検討
│
├── 分析（/analytics ← 新URL統合案）
│   ├── 月次トレンド
│   ├── カテゴリ内訳
│   ├── 予算 vs 実績（現/budget を統合）
│   ├── 固定費管理
│   ├── 貯蓄率トラッカー
│   └── 目標進捗詳細
│
├── AI（/ai ← /summary 改名案）
│   ├── AIチャット（メイン）
│   ├── 月次サマリー
│   └── 四半期インサイト
│
└── 設定（/settings）
    ├── プロフィール
    ├── カテゴリ管理
    ├── 目標設定
    ├── 通知設定
    ├── 連携（MoneyForward）
    ├── AI修正フィードバック
    ├── 世帯管理（招待・メンバー）
    └── 管理者（条件付き表示）
        ├── AI運用分析
        └── メンバー権限管理
```

---

### 画面責務一覧（整理後）

| 画面 | 目的 | 表示内容 | ユーザー操作 | 優先度 |
|------|------|---------|------------|--------|
| ホーム | 今月の状況を一目で把握 | 収支KPI・カテゴリドーナツ・異常警告・目標進捗・ストリーク | 月切替・詳細タップ | 最高 |
| 収支一覧 | 取引の確認・管理 | 取引リスト・フィルター・検索 | 編集・削除・フィルター | 高 |
| カレンダー | 日別の支出を把握 | 月カレンダー・日別ヒートマップ | 日タップ→詳細 | 中 |
| 分析 | 支出傾向の深堀り | トレンドチャート・予算vs実績・カテゴリ内訳 | チャートインタラクション | 中 |
| AI | AIとの対話・洞察取得 | チャット・月次サマリー・四半期インサイト | チャット入力・サマリー閲覧 | 中 |
| 設定 | 各種設定管理 | 設定項目リスト | 各設定への遷移 | 低（頻度低） |
| カテゴリ管理 | カテゴリCRUD | カテゴリリスト | 追加・編集・削除 | 低 |
| 目標設定 | 目標・予算の設定 | 目標リスト・フォーム | 目標追加・編集 | 低 |
| AI運用分析 | AI精度・コスト監視 | 統計チャート・ログ | データ確認・AI分析実行 | 最低（管理者のみ） |

---

### ナビゲーション案

#### 案A: 現状最小修正案（予算を分析に統合）

```
Bottom Navigation（モバイル）:
[ホーム] [収支] [+] [分析] [AI]

Sidebar（デスクトップ）:
ダッシュボード / 収支 / 分析 / AI / [設定アイコン]
```

- **メリット**: 変更最小・実装コスト低
- **デメリット**: カレンダーがBottomNavから消える

#### 案B: 5タブフラット案（設定を前面化）

```
Bottom Navigation:
[ホーム] [収支] [+] [分析] [設定]

※ AI は「分析」内のタブとして統合
※ カレンダーは収支一覧のビュー切替
```

- **メリット**: 設定への導線が明確
- **デメリット**: AI機能の存在が埋もれる

#### 案C: AI重視案（KAIの強みを前面化）

```
Bottom Navigation:
[ホーム] [記録] [+] [AI] [設定]

※ 「記録」= 収支一覧 + カレンダー切替
※ 「AI」= チャット + サマリー + 四半期インサイト
```

- **メリット**: AI機能が前面に出てKAIの差別化が明確
- **デメリット**: 「記録」という言葉が直感的でない可能性

**推奨: 案A**（まず予算管理を分析に統合し、設定アイコンをSidebarに追加）

---

## Phase 5: ワイヤーフレーム

---

### Home（モバイル）

```
┌─────────────────────────────┐
│  KAI logo        🔥3日  👤  │  ← ヘッダー
├─────────────────────────────┤
│  こんにちは、田中さん        │
│  2026.06.17                 │
├─────────────────────────────┤
│ [NOW] [分析] [AI戦略]       │  ← タブ
├─────────────────────────────┤
│ ⚠ 外食が先月比30%増です     │  ← AnomalyBanner
├─────────────────────────────┤
│      カテゴリ別支出          │
│   ┌────────┐  食費    42%  │
│   │  🍩    │  交通費  18%  │
│   │¥68,420 │  日用品  15%  │
│   │  今月  │  その他  25%  │
│   └────────┘               │
├─────────────────────────────┤
│  🎯 目標: 夏休み旅行        │
│  ████████░░ ¥85,000/¥100,000│
├─────────────────────────────┤
│ ┌──────┐ ┌──────┐           │
│ │ 食費  │ │ 交通費│           │
│ │¥28,600│ │¥12,200│           │
│ └──────┘ └──────┘           │
│ ┌──────┐ ┌──────┐           │
│ │日用品 │ │ 娯楽  │           │
│ │¥10,100│ │ ¥8,300│           │
│ └──────┘ └──────┘           │
├─────────────────────────────┤
│  支出/収入  68%             │
│  ██████░░░░                 │
├─────────────────────────────┤
│                             │
│ [ホーム][カレ] [+] [収支][AI]│  ← BottomBar
└─────────────────────────────┘
```

---

### OCR（レシート読取フロー）

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  ✕        支出を追加         │  │         解析中...            │
├─────────────────────────────┤  ├─────────────────────────────┤
│  ┌───────────────────────┐  │  │  ⊙ OCR解析中...             │
│  │ 📸  レシート読取       │  │  │  ▓▓▓▓▓▓░░░░ 64%            │
│  │ カメラでAI自動入力・3秒│  │  └─────────────────────────────┘
│  └───────────────────────┘  │
├─────────────────────────────┤  ┌─────────────────────────────┐
│         ▼ 選択後            │  │  解析完了 → 手入力に遷移    │
├─────────────────────────────┤  ├─────────────────────────────┤
│  [ カメラビュー / プレビュー ]│  │  支払先: [セブンイレブン]    │
│                             │  │  金額:   [¥ 580        ]    │
│        [📷 撮影]            │  │  日付:   [2026-06-17   ]    │
│     [📁 ギャラリーから選ぶ]  │  │  カテゴリ:[日用品  ▼   ]    │
└─────────────────────────────┘  │           信頼度 ●●●○○      │
                                  │                             │
                                  │         [保存する]          │
                                  └─────────────────────────────┘
```

---

### History（収支一覧）

```
┌─────────────────────────────┐
│  KAI       [2026年6月▼]  👤│
│            ← →              │
├─────────────────────────────┤
│  [🔍 検索...]               │
│  [全て▼] [支出▼] [カテゴリ▼]│
├─────────────────────────────┤
│  6月17日（今日）            │
│  ┌─────────────────────────┐│
│  │[🛒] セブンイレブン      ││
│  │     日用品      -¥580   ││
│  ├─────────────────────────┤│
│  │[🚃] Suica        交通費 ││
│  │     交通費    -¥1,200   ││
│  └─────────────────────────┘│
│  6月16日                    │
│  ┌─────────────────────────┐│
│  │[🍽] 松屋        外食    ││
│  │     外食         -¥550  ││
│  └─────────────────────────┘│
│   ... （続く）               │
├─────────────────────────────┤
│ [ホーム][カレ] [+] [収支][AI]│
└─────────────────────────────┘
```

---

### Analytics（分析 — 予算管理統合後）

```
┌─────────────────────────────┐
│  分析       [2026年6月▼]  👤│
├─────────────────────────────┤
│ [月次] [予算] [貯蓄] [固定費]│  ← 内部タブ
├─────────────────────────────┤
│  月次支出トレンド            │
│  ┌──────────────────────┐   │
│  │         /\           │   │
│  │        /  \  /\      │   │
│  │───/\──/    \/  \──   │   │  ← Recharts
│  │  /                   │   │
│  └─1─2─3─4─5─6──────┘   │
│                             │
│  カテゴリ別（今月）          │
│  食費    ████████░  42%     │
│  交通費  ████░░░░░  18%     │
│  日用品  ███░░░░░░  15%     │
│                             │
│  ──── 予算タブ ────         │
│  食費  ¥28,600/¥30,000 96% │
│  交通費 ¥12,200/¥15,000 81%│
│                             │
│  ──── 貯蓄率タブ ────      │
│  今月の貯蓄率: 32%          │
│  ████████░░░░               │
├─────────────────────────────┤
│ [ホーム][カレ] [+] [収支][AI]│
└─────────────────────────────┘
```

---

### Settings（設定）

```
┌─────────────────────────────┐
│  KAI                      👤│
│  設定                       │
├─────────────────────────────┤
│ ┌───────────────────────────┐
│ │  [👤] 田中 花子           │
│ │       hanako@example.com  │
│ │  [Google] [マイホーム]    │
│ └───────────────────────────┘
├─────────────────────────────┤
│  データ                     │
│  ├ 🏷 カテゴリ管理          >│
│  ├ 🎯 目標管理              >│
│  └ 🧠 AI修正フィードバック  >│
├─────────────────────────────┤
│  通知                       │
│  └ 🔔 通知設定              >│
├─────────────────────────────┤
│  連携                       │
│  └ [MF] MoneyForward連携   >│
├─────────────────────────────┤
│  管理者（管理者のみ表示）   │
│  ├ 📊 AI分析               >│
│  └ 👑 メンバー権限管理      >│
├─────────────────────────────┤
│  kai v2.4 · build 20260515  │
├─────────────────────────────┤
│ [ホーム][カレ] [+] [収支][AI]│
└─────────────────────────────┘
```

---

## Phase 6: Claude Design 引き継ぎ資料

---

### 1. プロダクト監査レポート

**KAI**は家族向けの家計簿Webアプリ（PWA）。Next.js 14 App Router + Supabase + Vercel + Claude APIで構築。Phase 2 / Week 12まで実装済み。主な強みはAI自動分類（5段階RAGパイプライン）とMoneyForward自動連携。

**技術スタック:**

| カテゴリ | 技術 |
|--------|------|
| FE | Next.js 14 / TypeScript / Tailwind / Recharts / TanStack Query |
| BE | Next.js API Routes / Vercel Cron |
| DB | Supabase（PostgreSQL / RLS / Row Level Security） |
| 認証 | Google OAuth（Supabase Auth） |
| AI | Claude Sonnet（サマリー・チャット）/ Claude Haiku（分類・予算・傾向） |
| インフラ | Vercel（Hosting + Cron） / PWA（Service Worker） |

---

### 2. 全機能一覧

Phase 1-1 参照（9カテゴリ・50以上の機能）

---

### 3. 全画面一覧

Phase 1-2 参照（22画面）

---

### 4. ナビゲーション一覧

Phase 1-3 参照

---

### 5. DB利用一覧

Phase 1-5 参照（29テーブル）

---

### 6. UX課題一覧

| # | 課題 | 深刻度 | 影響ユーザー |
|---|------|--------|------------|
| 1 | 予算管理（`/budget`）が主ナビに存在しない | 高 | 全ユーザー |
| 2 | AIチャットが2箇所に重複（ホームタブ + `/summary`） | 高 | 全ユーザー |
| 3 | 設定への導線がProfileDropdown（小アイコン）のみ | 中 | 全ユーザー |
| 4 | モバイルBottomNavとデスクトップSidebarの項目差異 | 中 | 全ユーザー |
| 5 | ホーム「AI戦略」タブ名が直感的でない | 中 | 全ユーザー |
| 6 | `/settings/mf` と `/settings/integrations/mf` の重複 | 低 | 技術的負債 |
| 7 | カレンダーと収支一覧が独立ページで重複感 | 低 | 全ユーザー |
| 8 | デモアカウントでOCR・MF機能が非表示だが説明なし | 低 | デモユーザー |

---

### 7. ユーザーフロー図

```
【コア日次フロー】
起動 → ホーム(NOW) → 支出追加(FAB)
         ↓                ↓
    状況確認        [手入力/OCR/CSV/MF]
         ↓                ↓
    月切替で        ManualEntryTab
    過去確認             ↓ 保存
                    ホームに反映

【週次振り返りフロー】
収支一覧 → フィルター → 修正・編集
    ↓
ホーム分析タブ → 傾向確認
    ↓（必要に応じて）
/summary AIチャット → 深掘り相談
    ↓
目標設定見直し

【月次Cronフロー（自動）】
月初Cron → 月次サマリー生成
         → スコア計算
         → 異常検知
         → MF自動取込
         → ユーザーが翌朝ホームを開くと反映
```

---

### 8. 新サイトマップ

Phase 4 参照

---

### 9. 画面責務一覧

Phase 4 参照

---

### 10. ワイヤーフレーム

Phase 5 参照（Home / OCR / History / Analytics / Settings）

---

### 11. UI刷新方針

#### 現在のデザインシステム

| 項目 | 値 |
|------|---|
| テーマ | ダークモード専用 |
| 背景色 | `#0c0a14` |
| アクセント Coral | `#fb9477` |
| アクセント Blue | `#7aa7ff` |
| アクセント Violet | `#a78bfa` |
| 数字フォント | JetBrains Mono |
| エフェクト | glassmorphism（backdropFilter blur）+ mesh gradient + グリッドオーバーレイ |
| アニメーション | `kai-rise`（フェードアップ）/ `kai-pulse-coral`（FABパルス） |
| UIライブラリ | shadcn/ui（button / dialog / input / label / select） |

#### UI刷新で解決すべきUX課題

| 優先度 | 課題 | 対応方針 |
|--------|------|---------|
| 最高 | 主ナビゲーション再設計 | 予算管理の追加、設定アイコンの明示化 |
| 高 | AIチャットの責務統一 | `/summary` を AI のホームとして確立、ホームタブからは除去 |
| 高 | ホーム画面のシンプル化 | 3タブ構造 → 2タブ（NOW / AI）に削減 |
| 中 | 予算管理と分析の統合 | `/budget` + AnalyticsTab → `/analytics` に統合 |
| 中 | モバイル・デスクトップ統一 | BottomBarとSidebarで同じ概念・ラベルを使う |

#### Claude Design への設計要件

| 要件 | 内容 |
|------|------|
| 対象プラットフォーム | PWAモバイル優先・デスクトップも対応（responsive） |
| ダークモード | 必須（現在ダークのみ。ライトモード対応は将来検討） |
| デザインシステム | 既存KAIトークン（`lib/kai-tokens.ts`）を継承・拡張 |
| ナビゲーション | モバイル5タブ以内、デスクトップサイドバー（設定アイコン追加） |
| 優先デザイン画面 | ①ホーム ②追加シート（AddPickerSheet） ③収支一覧 ④分析 ⑤AI |
| アクセシビリティ | `aria-label` 対応済み、継続必須 |
| アニメーション | 既存 `kai-*` アニメーションを継承 |
| コンポーネント制約 | shadcn/ui を使用中、Zustand・Edge Functionは使用禁止 |

---

*以上が全6フェーズの監査・設計資料。実コードから抽出した内容のみを根拠とし、推測を含まない。*
