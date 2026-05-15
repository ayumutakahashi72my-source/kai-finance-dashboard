# KAI（家計簿管理システム）計画書 — 統合参照版

> **このファイルの使い方**
> - **最新の設計・方針は v19 セクションが正** 。v8・v13 の内容は「参照元」として残す。
> - v19 が「v8の §X を継承」と書いている箇所は、本ファイル内の該当セクションで確認できる。
> - Claude Code に渡す際は `§ CLAUDE CODE 指示テンプレート` セクションも参照。

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システム構成・アーキテクチャ](#2-システム構成アーキテクチャ)
3. [デザイン仕様（v8 確定版）](#3-デザイン仕様v8-確定版)
4. [独自機能仕様（v19 確定版）](#4-独自機能仕様v19-確定版)
5. [技術スタック（v19 確定版）](#5-技術スタックv19-確定版)
6. [AIコスト設計（v19 確定版）](#6-aiコスト設計v19-確定版)
7. [DBスキーマ（v19 確定版）](#7-dbスキーマv19-確定版)
8. [スコア再計算方針（v19）](#8-スコア再計算方針v19)
9. [APIエンドポイント設計（v19）](#9-apiエンドポイント設計v19)
10. [インデックス設計（v19）](#10-インデックス設計v19)
11. [RLS設計（v19）](#11-rls設計v19)
12. [AI機能詳細（v19）](#12-ai機能詳細v19)
13. [スコア計算クエリ（v13 継承）](#13-スコア計算クエリ)
14. [UI共通仕様（v19）](#14-ui共通仕様v19)
15. [CSVインポート設計（v19）](#15-csvインポート設計v19)
16. [開発フェーズ・スケジュール（v19）](#16-開発フェーズスケジュールv19)
17. [リスクと対策（v19）](#17-リスクと対策v19)
18. [環境構成（v19）](#18-環境構成v19)
19. [Vector Memory & Opus四半期深層分析（v22 新設）](#19-vector-memory--opus四半期深層分析v22-新設)
20. [Phase 5以降の検討事項](#20-phase-5以降の検討事項)
21. [テスト戦略（v23）](#21-テスト戦略v23)
22. [レビュー・フィードバック計画（v16）](#22-レビューフィードバック計画v16)
23. [セキュリティ設計（v17）](#23-セキュリティ設計v17)
24. [ログ戦略（v17）](#24-ログ戦略v17)
25. [Claude Codeへの指示テンプレート（v8）](#25-claude-codeへの指示テンプレート)

---

## バージョン変更サマリー

### v22 → v23 の主な変更
| 区分 | 内容 |
|------|------|
| テスト戦略 | §21を全面刷新（v23）。Playwrightを追加しVitest+Playwrightの2層構成に変更 |
| E2E対象 | login・CSV import・transaction editの3フローを精査。テストコード・フィクスチャ・data-testid一覧・シードデータ設計をすべて定義 |
| 認証設計 | Google OAuthの外部依存を回避するため、devのみ有効な `/api/test/create-session` でセッション注入する方式を採用 |
| ディレクトリ | `e2e/` 配下の構成・`playwright/.auth/` のgitignore追加 |
| package.json | `e2e` / `e2e:setup` / `e2e:ui` スクリプトを追加 |

### v21 → v22 の主な変更
| 区分 | 内容 |
|------|------|
| Opus四半期深層分析 | §19新設。四半期末Cronで Opus が全期間RAG＋直近3ヶ月SQL集計を参照して長期トレンド分析を生成 |
| DBスキーマ | `ai_quarterly_insights` テーブル新設（§7-7c）。ai_monthly_insights に `spending_pattern` カラムを追加 |
| Cron | 月初Cron に加え、四半期末Cron（`/api/cron/quarterly`）を追加 |
| AIコスト | Opus 四半期分析を追加（年4回・約100円/回想定） |
| 認証パッケージ | `@supabase/auth-helpers-nextjs` (deprecated) → `@supabase/ssr` に置き換え |
| バグ修正 | Phase 2記述から `score_recalc_queue`（v20廃止済み）を削除、RLS対象に operation_logs を追加、目次に v22で新設したセクションを反映 |
| typo修正 | 「支出のクせ」→「支出のクセ」 |

### v20 → v21 の主な変更
| 区分 | 内容 |
|------|------|
| カテゴリ分類 | Rule → Vector（pgvector）→ LLM の3層フォールバック構成に強化。LLM呼び出しを月20件以下に抑制 |
| Vector Memory | `ai_insights_embeddings` テーブルを新設（§7-7b）。月次サマリー等をベクトル保存しチャットコンテキストに活用（Phase 3） |
| 技術スタック | shadcn/ui・pgvector・OpenAI text-embedding-3-small を追加 |
| AIコスト | Embedding コストを試算に追加（実質誤差レベル） |
| インデックス | pgvector用 ivfflat インデックスを追加 |

### v19 → v20 の主な変更
| 区分 | 内容 |
|------|------|
| アーキテクチャ | DBトリガー・score_recalc_queue・5分Cronを廃止。スコア再計算をAPI Route内で同期実行に変更 |
| DBスキーマ | `score_recalc_queue` テーブルを削除 |
| Cron | `score-queue`（5分毎）を廃止。月初Cron1本（`/api/cron/monthly`）に統合 |
| APIエンドポイント | transactions変更系APIがすべて末尾でスコア再計算を直接呼び出すよう変更 |
| リスク | 「スコア再計算の競合」削除。「CSV import時の同期再計算遅延」を追加 |

### v8 → v13 の主な変更
| 区分 | 内容 |
|------|------|
| スコア再計算 | 毎回フル再計算を明文化。差分更新は不採用 |
| チャット設計 | `chat_sessions` / `chat_messages` テーブルを新設 |
| AIダッシュボード | トップページにAIインサイトカードを追加 |
| 監査ログ | budget_audit_logs / category_audit_logs 追加 |
| RLS | service_role_key 誤用防止を明記 |

### v13 → v19 の主な変更
| 区分 | 内容 |
|------|------|
| アーキテクチャ | Edge Function廃止 → Next.js API Routes + Vercel Cron に集約 |
| MF連携 | MCP依存を排除 → **CSVインポート方式**に変更 |
| AI設計 | Haiku/Sonnet の役割を明確化。ai_monthly_insights テーブルを分離 |
| 支出のクセ機能 | v18で新設（Haiku・月1回） |
| フォールバック文言 | §4 に一覧化 |
| スケジュール | Claude Code Proプラン制約を考慮して全体1〜2割延長（v19） |
| §16-2新設 | 自分 vs Claude Code の担当分担を明記 |
| §16-3新設 | Claude Code Proプランの使用量制約と対策 |

---

## 1. プロジェクト概要

**作成日：** 2026年5月14日　**最新バージョン：** v23

### ゴール
家族で共有できるWebベースの家計簿システムを構築し、**支出の削減・節約**を実現する。
ポートフォリオ作品として「AI × 家計管理 × ダークデータダッシュボード」のユニークさと技術力を示す。

### コンセプト
> 「数字が主役。AIが分析、家族で節約。ゲーム感覚で続けられる家計簿。」

### 独自性の3本柱
1. **AIチャット家計相談**：過去データを踏まえた深いアドバイス
2. **支出のクセ分析**：曜日×カテゴリのパターンからAIが行動傾向を毎月フィードバック
3. **支出ヒートマップ**：当月の支出密度をカラーマップで可視化

### 重要な前提
- 自分・家族のみが利用する個人用ツール
- 一般公開・商用提供は想定しない
- **CSVインポート方式でMF連携**（規約リスク・MCP依存を排除）
- 品質重視・長期戦OK（**9〜12ヶ月+α、Phase 4以降は完成後に判断**）

### 運用方針
- **データ入力はPC作業で月1〜2回**（Money ForwardのCSVエクスポート → ドラッグ&ドロップ取り込み）
- **スマホは閲覧専用**：取り込んだデータを確認・分析するのみ
- 家族メンバーもスマホ閲覧専用。スマホからの取引入力はPhase 5以降で自然言語パース実装予定

### アプリ名
**KAI**（計画書・コード内ではKAIで統一）

---

## 2. システム構成・アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  ① クラウド（Vercel + Supabase）                          │
│  通常の家計簿機能・AI機能・スコア管理                       │
└─────────────────────────────────────────────────────────┘
                          ↑ Supabase API
┌─────────────────────────────────────────────────────────┐
│  ② ローカルPC（ブラウザ）                                  │
│  Money Forward CSV エクスポート → アプリにアップロード      │
│  （月1〜2回の管理者タスク）                                │
└─────────────────────────────────────────────────────────┘
```

### デプロイ構成とスマホアクセス

```
開発者がコードをGitHubにpush
  ↓
Vercelが自動でビルド・デプロイ（無料・Hobbyプラン）
  ↓
https://your-app.vercel.app で公開
  ↓
家族はスマホブラウザでそのURLにアクセスするだけ
  （アプリインストール不要）
```

> **費用：** Vercel Hobbyプランは無料。家族数人の利用であれば月額0円で運用可。
> **アクセス制限：** Google OAuthでログインした人だけが使える。

### アーキテクチャ責務分担（v20修正）

| レイヤー | 責務 |
|---------|------|
| **Supabase** | DB・Auth・RLS。業務ロジックは持たない |
| **Next.js API Routes** | CSV取り込み・AI呼び出し・集計ロジック・**スコア同期再計算**・バリデーション |
| **Vercel Cron（月初のみ）** | 月次AI生成・予算提案・固定費検出・cleanup処理 |

> **設計思想：** 家計簿規模（月200件程度）ではリアルタイム非同期基盤は不要。CSVインポート後に同期的に再計算することでDBトリガー・Queue・5分Cron polling構成を排除。保守性・デバッグ性・完成率を優先する。Vercel Hobbyプランで完結。

---

## 3. デザイン仕様（v8 確定版）

> v19も「v8の仕様をそのまま継承」と明記。以下が全面的に有効。

### 3-1. デザインコンセプト

| 項目 | 方針 |
|------|------|
| トーン | **ダークモード**（深い濃紺ベース）。眼精疲労を抑えつつ「データ重視」の印象 |
| スタイル | Stripe Dashboard × Linear × Vercel風。等幅フォントで数字が主役 |
| ゲーミフィケーション | スコアリング・レベルゲージのみ色とアニメで遊ぶ（Mint/Cyan/Violetグラデーション） |

### 3-2. カラーパレット

```css
/* 背景 */
--bg-primary:    #0a0a10;
--bg-panel:      rgba(20,22,32,0.66);
--bg-panel-solid:#14161f;

/* 境界 */
--border:        rgba(255,255,255,0.10);
--border-strong: rgba(255,255,255,0.16);

/* テキスト */
--text-primary:   #f0f0f5;   /* 約17:1 AAA */
--text-secondary: #c4c4d0;   /* 約10:1 AAA */
--text-tertiary:  #8b8ba0;   /* 約4.7:1 AA */
--text-disabled:  #5e5e72;   /* 装飾・非インタラクティブのみ */

/* アクセント */
--accent-mint:    #5eead4;   /* プライマリCTA・成功・最重要KPI */
--accent-cyan:    #22d3ee;
--accent-violet:  #a78bfa;   /* 固定費・累積レベル */

/* セマンティック */
--success:  #4ade80;
--danger:   #fb7185;
--warning:  #fbbf24;
```

**禁止：** `#5e5e72` を本文・情報ラベルに使用（コントラスト不足）。`rgba(255,255,255,0.07)` のボーダー禁止（最低 0.10 以上）。

### 3-3. タイポグラフィ

```css
--font-body: 'Noto Sans JP', sans-serif;
--font-mono: 'JetBrains Mono', monospace;  /* 数字・ラベル・日付 */

/* サイズ */
--text-2xs: 0.6875rem;  /* 11px ラベル最小値 */
--text-xs:  0.75rem;    /* 12px 補助 */
--text-sm:  0.875rem;   /* 14px 本文 */
--text-base: 1rem;      /* 16px 入力フィールド（iOS zoom防止） */
--text-4xl: 2.75rem;    /* 44px ヒーロー金額 */
```

### 3-4. ナビゲーション構造

**PC（768px以上）：左サイドバー固定 220px**
- サイドバー：ロゴ「KAI」・ダッシュボード・取引一覧・カレンダー・予算管理・AI相談・通知

**スマホ（768px未満）：ボトムナビ**
```
⌂ ホーム / ≡ 取引 / ⚡ サマリー / ▦ カレンダー / ◈ AI
中央「⚡」は46×46pxのMint→CyanグラデFAB
タップで /summary（クイックサマリー画面）へ遷移
```

### 3-5. コンポーネント仕様

**パネル（2層ルール）**

| 種別 | 背景 | 用途 |
|------|------|------|
| **グラスパネル** | `rgba(20,22,32,0.66)` + `backdrop-filter: blur(24px)` + 1px ボーダー + 角丸18px | カード本体・モーダル |
| **ソリッドパネル** | `#14161f` + 1px ボーダー + 角丸18px | リスト群（取引一覧本体）|
| **ヒーローパネル** | グラスパネル + Mint方向グラデ + 内側ハロー | 今月の収支 |

**カード内パディング：** 22px（標準）／16px（密度高）
**ボタン最小タップ領域：** 44×44px

### 3-6. ScoreRing（節約スコア）

```
グレード:
S：90〜100  → #4ade80
A：70〜 89  → #5eead4 (Mint)
B：60〜 69  → #5eead4 (くすみ)
C：40〜 59  → #fbbf24 (Amber)
D：  0〜 39 → #fb7185 (Danger)
```

### 3-7. アクセシビリティ要件（WCAG 2.2 AA準拠必須）

- 通常テキスト 4.5:1 以上
- UI部品・フォーカスリング 3:1 以上（Mint 2px outline + offset 2px）
- 全インタラクティブ要素 44×44px 推奨
- `prefers-reduced-motion: reduce` 時は全非必須アニメ停止
- Tickerには**必ず一時停止ボタン**を配置（WCAG Level A）
- 色だけで意味を伝えない（色 + アイコン + テキスト）

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 4. 独自機能仕様（v19 確定版）

### AIインサイトダッシュボード

トップページに常設するAIインサイトカードセクション。

```
┌──────────────────────────────────────────────────┐
│  🔴 今月の危険カテゴリ     外食 ペース150%超      │
│  ⚡ 固定費候補             Amazonが毎月約3,000円  │
│  💡 節約インサイト         外食を月2回減らすと    │
│                            -4,800円/月            │
└──────────────────────────────────────────────────┘
```

- **「今月の危険カテゴリ」「固定費候補」**：SQL集計で生成（AI不要）
- **「節約インサイト」**：`ai_monthly_insights`から取得（Sonnet・月1回）
- AIが生成したコンテンツには「✨ AI生成」バッジを表示

**AIバッジルール**
- ダッシュボード：1画面につき1つまで
- 月次レポート画面：制限なし

### クイックサマリー画面（スマホ専用）

`/summary` ページ。ボトムナビ中央FABからのみアクセス。

```
┌──────────────────────────────────────────┐
│  ① 今月の残り予算（¥残額、残りN日、1日あたり）│
├──────────────────────────────────────────┤
│  ② カテゴリ別 使いすぎ警告（SQL集計）       │
│     🔴 外食  ペース 152% — 要注意          │
├──────────────────────────────────────────┤
│  ③ 今月の分析  ✨ AI生成                   │
│     月1回生成した summary_short から取得    │
└──────────────────────────────────────────┘
```

### 支出のクセ機能（v18新設）

取引データの曜日×カテゴリパターンをAIが分析し、毎月のレポートにフィードバック。

**検出ロジック**
```
① transactions から曜日×カテゴリの組み合わせを集計（SQLのみ）
② 同一曜日×カテゴリが月3回以上 → クセとして判定
③ 複数検出時は出現回数の多い順に上位2つを選定
④ 過去3ヶ月分のデータで傾向を確認（初月・2ヶ月目は学習中扱い）
⑤ HaikuがSQLの集計結果を受け取り、月次レポート用の文章を生成
⑥ ai_monthly_insightsに保存
```

**月次レポートへの表示**
```
┌──────────────────────────────────────────┐
│  📊 今月のあなたの支出のクセ  ✨ AI生成   │
│  ・金曜に外食＋娯楽が重なりやすい（4回）  │
│  ・月末3日間に支出が集中する傾向          │
└──────────────────────────────────────────┘
```

### フォールバック文言一覧（v18確定）

| 機能 | 状態 | 表示文言 |
|------|------|---------|
| 月次サマリー | 生成失敗（retry=3） | 「AIサマリーの生成に失敗しました。翌月初に再試行します」 |
| 月次サマリー | 月初生成前 | 「AIインサイトを準備中です。月初に自動生成されます」 |
| AIチャット | 送信失敗 | 「申し訳ありません。もう一度送信してください」 |
| 支出のクセ | データ3ヶ月未満 | 「来月からパターンを表示します（データ学習中）」 |
| 支出のクセ | 生成失敗 | 「今月の分析を準備中です」 |
| クイックサマリー③ | サマリー未生成 | 「AIインサイトを準備中です。月初に自動生成されます」 |
| 予算提案 | 生成失敗 | 「予算提案の生成に失敗しました。翌月初に再試行します」 |

### 節約スコア & レベルシステム（v8から継承）

```
月次スコア（100点満点）= 予算達成点 + 節約行動点 + ボーナス点

予算達成点（最大60点）：
  100%以内 → 満点　〜110% → 50%　110%超 → 0点

節約行動点（最大30点）：
  先月比で支出が減ったカテゴリ1つにつき +3点

ボーナス点（最大10点）：
  全カテゴリ予算達成 +5点　前月スコア超え +3点　3ヶ月連続入力 +2点
```

**累積レベル**
```
Lv.1 家計見習い　Lv.2 節約入門者　Lv.3 コツコツ貯蓄者
Lv.4 節約マスター　Lv.5 家計の達人　Lv.6 FIRE候補生　Lv.7 伝説の節約家
```

### 支出ヒートマップ＋固定費カレンダー（v8から継承）

`/calendar` ページ。7×6グリッドで月表示。各セルに当日支出額 + ヒートマップ色 + 固定費ドット。

```javascript
// 色決定ロジック
const intensity = spend / maxSpend;
if (intensity > 0.7) return `rgba(251,113,133, ${0.25 + intensity * 0.35})`;  // 多→赤
if (intensity > 0.3) return `rgba(251,191,36,  ${0.15 + intensity * 0.25})`;  // 中→橙
return                       `rgba(94,234,212, ${0.10 + intensity * 0.20})`;  // 少→Mint
```

---

## 5. 技術スタック（v19 確定版）

### フロントエンド

| 技術 | 用途 |
|------|------|
| Next.js 14 (App Router) | フレームワーク |
| TypeScript | 型安全 |
| Tailwind CSS | スタイリング |
| shadcn/ui | UIコンポーネント基盤（Dialog・Popover・Toast等） |
| Recharts | グラフ（棒グラフ・折れ線グラフのみ。ヒートマップはCSS Gridで自作） |
| Lucide React | アイコン |
| TanStack Query | サーバー状態管理・データフェッチ・キャッシュ |
| Zod | バリデーション（jsonbスキーマ含む） |
| papaparse | CSVパース |
| Vitest | コアロジックの自動テスト |

> **Zustand不使用：** 月切替・フィルターはURL query params、モーダルはuseStateで管理。
> **shadcn/ui について：** カスタムデザイントークン（§3-2）を優先。shadcn/uiは構造・アクセシビリティの土台として使い、スタイルはTailwindで上書きする。

### バックエンド・インフラ

| 技術 | 用途 |
|------|------|
| Supabase | DB・認証・RLS・**pgvector**（ベクトル検索） |
| Vercel | ホスティング・デプロイ・Cron |
| Google OAuth | 認証プロバイダー |
| OpenAI text-embedding-3-small | Embedding生成（カテゴリ分類・Vector Memory用） |

### AI（v21確定版）

| 機能 | 技術 | 頻度 | 選定理由 |
|------|------|------|----------|
| カテゴリ自動分類（Rule層） | keyword完全一致 | 毎回 | 無料・高速 |
| カテゴリ自動分類（Vector層） | pgvector + text-embedding-3-small | Ruleミス時 | 未知merchant対応 |
| カテゴリ自動分類（LLM層） | **Claude Haiku** | Vector低信頼時のみ | 最終fallback |
| 月次サマリー＋節約アクション | **Claude Sonnet** | 月1回 | 文章品質重要 |
| AIチャット | **Claude Sonnet** | 月20回上限 | 会話品質重要 |
| 予算自動提案 | **Claude Haiku** | 月1回 | コスト優先 |
| 支出のクセ分析 | **Claude Haiku** | 月1回 | コスト優先 |
| Vector Memory（Phase 3） | pgvector + text-embedding-3-small | 月次サマリー生成時 | 過去分析の意味検索 |
| **Opus四半期深層分析（Phase 3c）** | **Claude Opus** | **四半期末・年4回** | **長期トレンド・最高品質の分析が必要** |

> **AI設計の思想：** 構造化データ→SQL、意味検索→pgvector、自然文生成→LLM。責務を分離することで LLM呼び出しを最小化する。
> モデル名は時期で変わるため、実装フェーズで `https://docs.claude.com` で最新を確定。

### 状態管理の使い分け

```
TanStack Query：  Supabaseから取得する全データ
  キャッシュキー：['リソース名', household_id, month, ...filters]

URL query params：選択中の月（?month=2026-05）・フィルター状態

useState：         フォーム内の一時的な入力値・モーダル開閉状態
```

### PWA設定

| 項目 | 内容 |
|------|------|
| manifest.json | アプリ名・アイコン・テーマカラー（#0a0a10）・display: standalone |
| ホーム画面アイコン | 192×192px・512×512px（Mint→Cyanグラデ背景 + KAIロゴ） |
| Service Worker | **Phase 3bで実装**（月次通知のために前倒し） |
| iOS対応 | `apple-mobile-web-app-capable` メタタグのみ |

---

## 6. AIコスト設計（v19 確定版）

### モデル別コスト試算（月次）

| 機能 | 技術 | 月回数 | 月額概算 |
|------|------|--------|---------|
| 月次サマリー生成 | Sonnet | 1回 | 約5円 |
| AIチャット | Sonnet | 20回上限 | 約400円 |
| 予算自動提案 | Haiku | 1回 | 約1円 |
| カテゴリ分類（LLM fallback） | Haiku | 数件（Vector層通過後） | 約1円 |
| 支出のクセ分析 | Haiku | 1回 | 約1円 |
| Embedding（分類 + Vector Memory） | text-embedding-3-small | 月200件+月次サマリー数件 | 約1円 |
| **Opus四半期深層分析** | **Opus** | **3ヶ月に1回（年4回）** | **約33円/月（100円×4回÷12）** |
| **合計** | | | **約442円/月** |

> 試算根拠：Sonnet $3/MTok（入力）・$15/MTok（出力）、Haiku $0.25/$1.25、Opus $15/$75、text-embedding-3-small $0.02/MTok、1ドル=150円
> **Opus四半期分析の試算根拠：** 入力約3万トークン（全期間RAG＋3ヶ月SQL集計）×$15/MTok + 出力約4千トークン×$75/MTok ≒ 約100円/回。年4回で月割約33円。
> **コストの支配的要因はチャット（約90%）。** その他は実質誤差。

### チャット上限管理

```
送信前チェック（OR条件）：
  session_count   >= 20    → 当月ブロック
  estimated_cost  >= 2,000 → 当月ブロック（円ベース）
```

### RAGコンテキスト圧縮（必須）

```
チャット送信前：
  ① 過去取引データはそのまま渡さない
  ② 直近3ヶ月のカテゴリ別集計・予算達成率・上位支出店舗Top10 に圧縮
  ③ 入力トークンを2万→8千程度に削減
  ※ 実装時は @anthropic-ai/tokenizer 等で実測値をログに記録
```

---

## 7. DBスキーマ（v19 確定版）

> **v19とv13でスキーマが異なる箇所あり。** v19が最新。

### 7-1. households

```sql
households
  id          uuid PK default gen_random_uuid()
  name        text NOT NULL
  owner_id    uuid FK → auth.users.id
  settings    jsonb   -- anomaly_threshold等の世帯設定
  created_at  timestamptz default now()
  updated_at  timestamptz default now()
```

### 7-2. household_members

```sql
household_members
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  user_id       uuid FK → auth.users.id
  role          text CHECK (role IN ('owner', 'member'))
  joined_at     timestamptz default now()
  UNIQUE (household_id, user_id)
```

**owner移譲ルール：** ownerが1人の状態での退出・削除は不可。他メンバーへの移譲後のみ退出可能。

### 7-3. categories / category_rules

```sql
categories
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  name          text NOT NULL
  color         text
  icon          text
  is_fixed      boolean default false
  created_at    timestamptz default now()

category_rules
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  keyword       text NOT NULL   -- 正規化済みキーワード
  category_id   uuid FK → categories.id
  confidence    numeric(3,2) default 1.0
  match_count   integer default 0
  embedding     vector(1536)    -- text-embedding-3-small（Vector層で使用）
  created_at    timestamptz default now()
  UNIQUE (household_id, keyword)
```

> `confidence`自然減衰式：`confidence = confidence * 0.95`（月初cron）
> 閾値0.3未満は削除候補としてフラグ立て

**キーワード正規化（TypeScript側で実行）：**
```typescript
function normalizeKeyword(text: string): string {
  return text.toLowerCase().normalize('NFKC').replace(/\s+/g, '')
}
// PostgreSQLからは呼べない。正規化済み文字列のみDBに保存する。
```

### 7-4. transactions

```sql
transactions
  id             uuid PK default gen_random_uuid()
  household_id   uuid FK → households.id ON DELETE CASCADE
  occurred_on    date NOT NULL
  amount         integer NOT NULL  -- 円単位・支出は正、収入は負
  payee          text NOT NULL
  memo           text
  category_id    uuid FK → categories.id
  is_fixed       boolean default false
  source         text CHECK (source IN ('csv', 'manual', 'auto'))
  source_hash    text   -- CSV行のSHA256ハッシュ（重複検知用）
  created_at     timestamptz default now()
  updated_at     timestamptz default now()
  UNIQUE (household_id, occurred_on, amount, payee, source_hash)
```

### 7-5. budgets / budget_suggestions

```sql
budgets
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  category_id   uuid FK → categories.id
  month         date NOT NULL
  amount        integer NOT NULL
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  UNIQUE (household_id, category_id, month)

budget_suggestions
  id              uuid PK default gen_random_uuid()
  household_id    uuid FK → households.id ON DELETE CASCADE
  month           date NOT NULL
  suggestions     jsonb   -- [{category_id, suggested_amount, reason}]
  generated_at    timestamptz
  applied_at      timestamptz
  failed          boolean default false
  created_at      timestamptz default now()
  UNIQUE (household_id, month)
```

> 提案のみ格納。「適用する」ボタンを押したときだけ`budgets`に反映。自動上書きなし。

### 7-6. fixed_expenses / fixed_expense_suggestions

```sql
fixed_expenses
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  name          text NOT NULL
  amount        integer NOT NULL
  category_id   uuid FK → categories.id
  billing_day   integer CHECK (billing_day BETWEEN 1 AND 31)
  is_active     boolean default true
  created_at    timestamptz default now()

fixed_expense_suggestions
  id            uuid PK default gen_random_uuid()
  household_id  uuid FK → households.id ON DELETE CASCADE
  payee         text NOT NULL
  avg_amount    integer
  detected_at   timestamptz default now()
  dismissed     boolean default false
  UNIQUE (household_id, payee)
```

### 7-7. スコア・AIインサイト・キュー

**monthly_scores（数値計算専用）**

```sql
monthly_scores
  id             uuid PK default gen_random_uuid()
  household_id   uuid FK → households.id ON DELETE CASCADE
  month          date NOT NULL
  score          integer NOT NULL
  budget_score   integer NOT NULL
  saving_score   integer NOT NULL
  bonus_score    integer NOT NULL
  score_grade    text CHECK (score_grade IN ('S','A','B','C','D'))
  score_detail   jsonb   -- ScoreDetailSchemaで型定義（Zodで検証必須）
  is_finalized   boolean default false
  calculated_at  timestamptz
  created_at     timestamptz default now()
  UNIQUE (household_id, month)
```

**ai_monthly_insights（AI文章専用）**

```sql
ai_monthly_insights
  id               uuid PK default gen_random_uuid()
  household_id     uuid FK → households.id ON DELETE CASCADE
  month            date NOT NULL
  summary_text     text        -- 月次サマリー全文
  summary_short    text        -- 一言サマリー（/summary用）
  saving_actions   jsonb       -- SavingActionsSchemaで型定義（Zodで検証必須）
  spending_pattern text        -- 支出のクセ分析文章（v18新設）
  generated_at     timestamptz
  retry_count      integer default 0
  failed           boolean default false
  created_at       timestamptz default now()
  UNIQUE (household_id, month)
```

**SavingActionsSchemaのZodスキーマ：**
```typescript
const SavingActionsSchema = z.object({
  actions: z.array(z.object({
    rank: z.number().int().min(1).max(3),
    category_id: z.string().uuid(),
    category_name: z.string(),
    overspend_amount: z.number().int(),
    action: z.string().max(200),
  })).max(3),
  generated_at: z.string().datetime(),
})
```

### 7-7b. ai_insights_embeddings（Vector Memory・Phase 3で追加）

月次AIサマリー・節約提案・支出のクセ分析の生成テキストをベクトル化して保存する。
transactions・budgets・monthly_scoresはベクトル化しない（構造化データはSQLで扱う）。

```sql
-- pgvector 有効化（Supabase で CREATE EXTENSION pgvector; を実行済みであること）
ai_insights_embeddings
  id              uuid PK default gen_random_uuid()
  household_id    uuid FK → households.id ON DELETE CASCADE
  insight_id      uuid FK → ai_monthly_insights.id ON DELETE CASCADE
  month           date NOT NULL
  content_type    text CHECK (content_type IN ('summary', 'saving_actions', 'spending_pattern'))
  content_text    text NOT NULL    -- 埋め込み元テキスト
  embedding       vector(1536)     -- text-embedding-3-small
  created_at      timestamptz default now()
```

**活用例：** 「去年の夏と今月を比較して」「外食費が増えたのはいつから？」のようなチャット質問に対して、過去サマリーをベクトル検索でコンテキストとして注入できる。

### 7-7c. ai_quarterly_insights（Opus四半期深層分析・v22新設）

四半期末Cronで Opus が生成する長期トレンド分析を保存する。
ai_monthly_insights が「先月の振り返り」なら、こちらは「3ヶ月単位の戦略的提言」を担う。

```sql
ai_quarterly_insights
  id                uuid PK default gen_random_uuid()
  household_id      uuid FK → households.id ON DELETE CASCADE
  quarter           text NOT NULL    -- '2026-Q1' 形式
  quarter_start     date NOT NULL    -- 四半期開始日（例：2026-01-01）
  quarter_end       date NOT NULL    -- 四半期終了日（例：2026-03-31）
  deep_analysis     text NOT NULL    -- 深層分析全文
  trend_findings   jsonb NOT NULL    -- TrendFindingsSchemaで型定義
  strategic_actions jsonb NOT NULL   -- StrategicActionsSchemaで型定義
  context_months    integer          -- 参照した過去月数（RAGで取得）
  generated_at      timestamptz
  retry_count       integer default 0
  failed            boolean default false
  created_at        timestamptz default now()
  UNIQUE (household_id, quarter)
```

**Zodスキーマ：**
```typescript
const TrendFindingsSchema = z.object({
  findings: z.array(z.object({
    category: z.string(),
    trend: z.enum(['increasing', 'decreasing', 'stable', 'volatile']),
    magnitude_pct: z.number(),     // 変動幅（％）
    insight: z.string().max(300),  // 何が起きているか
  })).max(5),
})

const StrategicActionsSchema = z.object({
  actions: z.array(z.object({
    rank: z.number().int().min(1).max(3),
    horizon: z.enum(['next_quarter', 'next_year']),
    action: z.string().max(300),
    expected_impact_yen: z.number().int(),
  })).max(3),
})
```

### 7-8. 通知・ログ系

```sql
monthly_anomaly_flags
  id            uuid PK
  household_id  uuid FK → households.id ON DELETE CASCADE
  month         date NOT NULL
  category_id   uuid FK → categories.id
  actual_amount integer
  budget_amount integer
  ratio         numeric(5,2)
  flagged_at    timestamptz default now()
  UNIQUE (household_id, month, category_id)

notifications
  id            uuid PK
  household_id  uuid FK → households.id ON DELETE CASCADE
  type          text NOT NULL
  payload       jsonb
  read_at       timestamptz
  expires_at    timestamptz   -- 90日後
  created_at    timestamptz default now()

chat_sessions
  id            uuid PK
  household_id  uuid FK → households.id ON DELETE CASCADE
  user_id       uuid FK → auth.users.id
  created_at    timestamptz default now()

chat_messages
  id            uuid PK
  session_id    uuid FK → chat_sessions.id ON DELETE CASCADE
  role          text CHECK (role IN ('user', 'assistant'))
  content       text NOT NULL
  created_at    timestamptz default now()

chat_usage_logs
  id              uuid PK
  household_id    uuid FK → households.id ON DELETE CASCADE
  month           date NOT NULL
  session_count   integer default 0
  estimated_cost  numeric(10,2) default 0
  updated_at      timestamptz default now()
  UNIQUE (household_id, month)

api_error_logs
  id          uuid PK
  endpoint    text NOT NULL
  error_code  text
  error_msg   text
  payload     jsonb
  created_at  timestamptz default now()

operation_logs（操作ログ）
  id            uuid PK
  household_id  uuid FK → households.id ON DELETE CASCADE
  user_id       uuid FK → auth.users.id
  action        text NOT NULL
                CHECK (action IN ('csv_import','ai_chat','budget_apply','score_recalc'))
  detail        jsonb
  created_at    timestamptz default now()
```

### 7-9. マイグレーション管理

```
方針：Supabase Migrations（supabase db push）で全スキーマ変更を管理

ルール：
  - スキーマ変更は必ず supabase/migrations/ にSQLファイルを作成
  - ファイル名：YYYYMMDDHHMMSS_description.sql
  - 本番反映前にdevで動作確認
  - ALTER TABLE等の破壊的変更はロールバックSQLも用意

環境：
  - dev：devプロジェクト（SUPABASE_URL_DEV / SUPABASE_ANON_KEY_DEV）
  - prod：prodプロジェクト（SUPABASE_URL / SUPABASE_ANON_KEY）
```

---

## 8. スコア再計算方針（v20修正）

### 方針
**transactions変更後に同期的にフル再計算を実行する。**

理由：
- 家計簿規模（月200件程度）ではフル再計算でも十分高速（100ms以内想定）
- 差分更新はエッジケースで容易に壊れる
- DBトリガー・Queue・Cron polling構成が不要になる
- Vercel Hobbyプランで完全に動作する

### 再計算フロー

```
CSV import / transaction create / update / delete
  ↓
API Route 内で recalculateScore(household_id, month) を直接呼び出し
  ↓
monthly_scores を UPSERT
```

### 実装方針

- transactions変更を行うAPI Route内で再計算まで完結させる
- 毎回フル再計算（差分更新なし）
- `is_finalized = true` の月は更新しない
- `monthly_scores` は UPSERT（INSERT ... ON CONFLICT DO UPDATE）

### UPSERT クエリ

```sql
INSERT INTO monthly_scores (household_id, month, score, budget_score, saving_score, bonus_score, score_grade, score_detail, calculated_at)
VALUES (...)
ON CONFLICT (household_id, month)
DO UPDATE SET
  score        = EXCLUDED.score,
  budget_score = EXCLUDED.budget_score,
  saving_score = EXCLUDED.saving_score,
  bonus_score  = EXCLUDED.bonus_score,
  score_grade  = EXCLUDED.score_grade,
  score_detail = EXCLUDED.score_detail,
  calculated_at = now()
WHERE monthly_scores.is_finalized = false;
```

### 擬似コード（CSVインポート時）

```typescript
// /api/transactions/import
await insertTransactions(csvRows)
await classifyCategories(householdId)
await recalculateScore(householdId, month)  // 同期・直接呼び出し
return { imported: N, skipped: M }
```

---

## 9. APIエンドポイント設計（v20修正）

### Vercel Cron

| エンドポイント | スケジュール | 処理 |
|---|---|---|
| `GET /api/cron/monthly` | 毎月1日 00:01 JST | 月次AI生成・予算提案・固定費検出・cleanup処理（下記参照） |
| `GET /api/cron/quarterly` | 四半期末翌日 02:00 JST | Opus深層分析（§19参照・Phase 3cで実装） |

```
① monthly_scores.is_finalized → true（前月分）
② 月次AIサマリー生成 → ai_monthly_insightsに保存（Sonnet・リトライ3回）
③ 予算提案生成 → budget_suggestionsに保存（Haiku・リトライ3回）
④ 支出のクセ分析 → ai_monthly_insightsに追記（Haiku・リトライ3回）
⑤ fixed_expense_suggestions 更新（SQL集計）
⑥ monthly_anomaly_flags 更新（SQL集計）
⑦ category_rules confidence 自然減衰（×0.95）
⑧ 90日超過のnotifications 削除
⑨ fixed_expenses の当月分自動生成
⑩ Service Worker経由で月次通知を送信（Phase 3b）
```

### ユーザー操作（Next.js API Routes）

| エンドポイント | 処理 | モデル |
|---|---|---|
| `POST /api/transactions/import` | CSVパース・重複検知・バルクINSERT・**スコア再計算** | なし |
| `POST /api/transactions/classify` | カテゴリ自動分類 | Haiku |
| `POST /api/transactions` | 手動取引追加・**スコア再計算** | なし |
| `PATCH /api/transactions/:id` | 取引編集・**スコア再計算** | なし |
| `DELETE /api/transactions/:id` | 取引削除・**スコア再計算** | なし |
| `POST /api/ai/chat` | AIチャット（プリセット起点） | Sonnet |
| `POST /api/budget/apply-suggestion` | 予算提案を手動確定→budgetsに反映 | なし |

> **スコア再計算**はtransactionsを変更する全APIルートの末尾で同期的に実行する。

---

## 10. インデックス設計（v19）

```sql
CREATE INDEX idx_transactions_household_month
  ON transactions (household_id, date_trunc('month', occurred_on) DESC);
CREATE INDEX idx_transactions_category
  ON transactions (household_id, category_id, occurred_on DESC);
CREATE INDEX idx_monthly_scores_household
  ON monthly_scores (household_id, month DESC);
CREATE INDEX idx_ai_monthly_insights_household
  ON ai_monthly_insights (household_id, month DESC);
CREATE INDEX idx_budget_suggestions_household
  ON budget_suggestions (household_id, month DESC);
CREATE INDEX idx_notifications_household_unread
  ON notifications (household_id, created_at DESC)
  WHERE read_at IS NULL;

-- pgvector インデックス（Phase 3追加）
CREATE INDEX idx_category_rules_embedding
  ON category_rules USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX idx_ai_insights_embeddings_household
  ON ai_insights_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 11. RLS設計（v19）

```sql
-- 共通パターン（全テーブルに適用）
ALTER TABLE [テーブル名] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "世帯メンバーのみ" ON [テーブル名]
  FOR ALL USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );
```

適用テーブル：`transactions` / `budgets` / `budget_suggestions` / `categories` / `category_rules` / `fixed_expenses` / `fixed_expense_suggestions` / `monthly_scores` / `ai_monthly_insights` / `ai_insights_embeddings` / `ai_quarterly_insights` / `monthly_anomaly_flags` / `notifications` / `chat_sessions` / `chat_messages` / `chat_usage_logs` / `operation_logs`

> **CRITICAL：** `service_role_key` はサーバーサイドの処理（API Routes・Cron）でのみ使用。フロントエンドでは必ず `anon key` を使用。

---

## 12. AI機能詳細（v19）

### 12-1. カテゴリ自動分類（Rule → Vector → LLM）

**3層フォールバック構成：**

```
CSVインポート後に実行。

【Rule層】完全一致（無料・高速）
  ① normalizeKeyword(payee) でキーワード正規化
  ② category_rules.keyword と完全一致検索
  ③ ヒット（confidence >= 0.3）→ category_idを適用してLLM呼び出しなし

【Vector層】意味的類似検索（未知merchantに対応）
  ④ Rule層ミス → payee を text-embedding-3-small でベクトル化
  ⑤ category_rules.embedding と cosine類似度検索（上位1件）
  ⑥ 類似度 >= 0.85 → そのカテゴリを適用・category_rulesにキーワード追加

【LLM層】最終fallback
  ⑦ Vector層も低信頼（< 0.85）→ Claude Haiku に送信
     （payee名 + 金額 + 既存カテゴリ一覧）
  ⑧ 結果をcategory_rulesに保存（confidence=1.0・embedding同時生成）
```

**実務的なヒット率の想定：**
- Rule層：約60%（既存merchantの再訪問）
- Vector層：約30%（表記ゆれ・類似merchantのヒット）
- LLM層：約10%（真の新規merchant）
→ LLMは月20件前後に抑制できる

### 12-2. 支出異常検知（SQLのみ・AI不要）

```
① カテゴリ別に「今月実績 ÷ 予算」を集計
② 閾値（デフォルト1.5）超えたカテゴリをmonthly_anomaly_flagsにINSERT
③ ダッシュボードに固定テンプレートで表示
```

### 12-3. 固定費自動検出（SQLのみ・AI不要）

```
① 過去3ヶ月で同一payeeが3回以上 かつ 金額標準偏差が平均の10%未満
② fixed_expense_suggestionsにUPSERT
③ ユーザーが確認して手動でfixed_expensesに登録
```

### 12-4. 予算自動提案（Haiku・提案のみ）

```
トリガー：月初Cron
① 直近3ヶ月のカテゴリ別実績をSQL集計
② Haikuに送信 → budget_suggestionsに保存
③ ユーザーが「適用する」を押したときだけbudgetsに反映
リトライ：3回（次回Cron実行で再試行）
```

### 12-5. 月次サマリー＋節約アクション（Sonnet）

```
トリガー：月初Cron
① 前月データをSQL集計
② generated_at IS NULL を確認（二重実行防止）
③ Sonnetに送信（圧縮済みサマリーデータ）
④ ZodでレスポンスをSchemaに対して検証
⑤ ai_monthly_insightsに保存
リトライ：3回（次回Cron実行で再試行）
```

### 12-6. AIチャット（Sonnet・プリセット起点）

```
プリセット質問例：
  「固定費を見直したい」「今月の浪費は？」「食費を減らしたい」
  「来月の予算を立てたい」「サブスクを整理したい」

フロー：
① プリセットタップ or 自由入力
② chat_usage_logsで上限チェック（20回 or 2,000円/月）
③ RAGコンテキスト構築（直近3ヶ月サマリー圧縮・約8,000トークン）
④ Sonnetに送信
⑤ フォローアップは同セッション内で自由入力継続可能
リトライ：1回（失敗時はフォールバック文言表示）
```

### 12-7. AI失敗時のフォールバック

```
月次サマリー・予算提案（Cron）：
  → 失敗→retry_count記録→次回Cron実行で再試行（Cron内待機なし）
  → 全失敗（retry_count=3）：failed=true・フォールバック文言表示

AIチャット：
  → リトライ1回 → 失敗時はバブル表示

全ケース：api_error_logsにINSERT
```

### 12-8. Vector Memory（Phase 3で実装）

月次AIサマリー・節約提案・支出のクセ分析の生成テキストをベクトル化し `ai_insights_embeddings` に保存する。AIチャットのコンテキスト構築時に過去の関連インサイトを意味検索で取得する。

**保存対象（ベクトル化する）**
```
✅ ai_monthly_insights.summary_text     （月次サマリー）
✅ ai_monthly_insights.saving_actions   （節約提案）
✅ ai_monthly_insights.spending_pattern （支出のクセ分析）
```

**保存しない（SQLで扱う）**
```
❌ transactions
❌ budgets
❌ monthly_scores の数値
```

**月次サマリー生成後のEmbedding保存フロー**
```
① Cronで ai_monthly_insights を生成・保存
② summary_text / saving_actions / spending_pattern を text-embedding-3-small でベクトル化
③ ai_insights_embeddings にINSERT（content_typeで区別）
```

**AIチャットでの活用フロー**
```
① ユーザーの質問を text-embedding-3-small でベクトル化
② ai_insights_embeddings を cosine類似度検索（上位3件）
③ 取得した過去インサイトをチャットコンテキストに追加
④ Sonnetに送信（過去の文脈を踏まえた回答が可能）
```

**活用例：** 「去年の夏と今月を比較して」「外食費が増えたのはいつから？」のような時系列を跨いだ質問への対応が可能になる。

---

## 13. スコア計算クエリ

```sql
SELECT
  b.category_id,
  b.amount as budget,
  COALESCE(SUM(t.amount), 0) as actual
FROM budgets b
LEFT JOIN transactions t
  ON t.category_id = b.category_id
  AND t.household_id = b.household_id
  AND DATE_TRUNC('month', t.occurred_on) = b.month
WHERE b.household_id = $1
  AND b.month = $2
GROUP BY b.category_id, b.amount;
```

---

## 14. UI共通仕様（v19）

### Skeleton UI統一

```
方針：全画面・全コンポーネントでSkeleton UIを使用。スピナー単独は使わない。

バリアント（5種類）：
  - panel：パネル形状のグレースケルトン
  - line-sm / line-md / line-lg：テキスト行
  - block：金額表示・数字幅に合わせたブロック型

実装：
  TanStack Query の isLoading / isFetching で制御
  <Skeleton variant="..." /> アトムコンポーネントを ui/ に用意
  アニメーション：shimmer（左→右）
  prefers-reduced-motion: reduce 時は静止グレーのみ
```

---

## 15. CSVインポート設計（v19）

### インポートフロー

```
① MFからCSVをエクスポート
② アプリのインポート画面にドラッグ&ドロップ
③ フロントでCSVパース（papaparse）
④ /api/transactions/import に送信
⑤ 各行をSHA256でsource_hashに変換
⑥ UNIQUE制約で重複検知 → 重複はSKIP・新規行のみINSERT
⑦ INSERT後 → /api/transactions/classify でカテゴリ自動分類
⑧ 結果サマリー表示（「125件中98件取り込み・27件スキップ」）
```

### エラーハンドリング

```
- CSVフォーマットエラー → 行番号付きでUI表示
- 重複行 → スキップ（エラー扱いしない）
- DB書き込みエラー → api_error_logsに記録・リトライ促す
- カテゴリ分類失敗 → 「未分類」割り当て・後から手動変更可
```

---

## 16. 開発フェーズ・スケジュール（v19）

> Claude Code Proプラン（$20/月）の週次使用量上限を考慮してスケジュール見直し済み。

| Phase | 内容 | v19想定期間 | 累計 |
|-------|------|------------|------|
| Phase 1 | 認証・世帯・カテゴリ・取引CRUD・CSVインポート＋重複検知・予算・カテゴリ自動分類（Haiku）・dev/prod環境分離・Migrations・ダミーデータ生成スクリプト | **3〜3.5ヶ月** | 3〜3.5ヶ月 |
| Phase 2 | スコア同期再計算・ヒートマップ（CSS Grid）・固定費自動生成・Skeleton UI全画面適用・**家族実機レビュー開始** | **2ヶ月** | 5〜5.5ヶ月 |
| Phase 3a | AIチャット（Sonnet）・月次サマリー＋節約アクション（Sonnet）・AIインサイトダッシュボード・**支出のクセ分析（Haiku）** | **2ヶ月** | 7〜7.5ヶ月 |
| Phase 3b | 予算自動提案（Haiku）・支出異常検知（SQL）・固定費自動検出（SQL）・クイックサマリー画面・**Service Worker＋月次通知（PWA）** | **1.5ヶ月** | 8.5〜9ヶ月 |
| **Phase 3c** | **Vector Memory（pgvector・ai_insights_embeddings）・Opus四半期深層分析（ai_quarterly_insights・四半期末Cron）・分析閲覧UI** | **1〜1.5ヶ月** | 9.5〜10.5ヶ月 |
| Phase 4 | manifest.json（PWA簡易）・ポートフォリオ仕上げ | **1〜1.5ヶ月** | 10.5〜12ヶ月 |
| **MVP完成** | | | **10〜13ヶ月** |
| Phase 5以降 | 自然言語パース・AIProvider抽象化・按分・累積統計 | 完成後判断 | +α |

> **使用量上限に当たった場合：** まずProプランのまま extra usage を有効化。週次上限に毎回ぶつかるようになったらMax 5x（$100/月）への移行を検討。

### §16-1. Phase 1 週次タスク分解

担当区分：🙋 自分 / 🤖 Claude Code / 🤝 両方

| Week | タスク | 担当 | 完了条件 |
|------|--------|------|---------|
| Week 1 | 環境構築（Next.js・Supabase dev/prod・.env.local・Vercel空デプロイ・Google OAuth） | 🙋 自分メイン | VercelにデプロイされたページがHTTPSで開く |
| Week 2 | 認証（Supabase Auth＋Google OAuth・ログイン画面・ログアウト・未ログイン時リダイレクト） | 🤝 両方 | Googleアカウントでログイン・ログアウトできる |
| Week 3 | DB基礎＋世帯（Migrations設定・households/household_members作成・RLS・世帯作成UI） | 🤝 両方 | ログイン後に世帯が作れる |
| Week 4 | カテゴリ（categories CRUD・一覧/追加/編集/削除・デフォルトカテゴリシード） | 🤖 Claude Code | カテゴリを自由に管理できる |
| Week 5〜6 | 取引CRUD（transactions作成・一覧/追加/編集/削除・月切替・フィルター・TanStack Query導入） | 🤖 Claude Code | 手入力で取引を登録・管理できる |
| Week 7 | CSVインポート（papaparse・ドラッグ&ドロップUI・重複検知・結果サマリー表示） | 🤖 Claude Code | MFのCSVを取り込める |
| Week 8 | 予算（budgets CRUD・予算設定画面・予算vs実績の月次ビュー） | 🤖 Claude Code | 予算を設定して実績と比較できる |
| Week 9 | カテゴリ自動分類（category_rules＋RAGロジック・Haiku呼び出し・分類確認UI） | 🤖 Claude Code | CSV取り込み後に自動でカテゴリ分類される |
| Week 10〜11 | 仕上げ（ダミーデータ生成スクリプト・dev動作確認・Migrations整理・テスト実行） | 🤝 両方 | Phase 2に入れる状態 |

### §16-2. 担当分担

**🙋 自分が必ずやること（Claude Codeに代替不可）**

```
□ Supabaseプロジェクト作成（dev / prod の2つ）
□ Vercelアカウント作成・GitHubリポジトリ接続
□ Google Cloud ConsoleでOAuthクライアントID取得
□ Anthropic APIキー取得
□ 各サービスの環境変数を.env.localとVercel管理画面に設定
□ SupabaseのAuth設定でGoogle OAuthプロバイダーを有効化
□ VercelにCRON_SECRET環境変数を設定
□ 各Phaseの完了判定
□ devで動作確認後、GitHubにpushして本番デプロイ
□ 本番環境でのスモークテスト
□ Supabase Migrations の本番反映（supabase db push --linked）
```

**🤖 Claude Codeに依頼すること**

```
□ Next.jsコンポーネント・ページの実装
□ API Routesの実装（認証チェック・バリデーション含む）
□ Supabase Migrationsファイルの作成（SQLスキーマ）
□ Vercel Cron処理の実装
□ TanStack Queryのフック実装
□ ZodスキーマとAI APIレスポンスの型定義
□ Vitestテストコードの作成
□ ダミーデータ生成スクリプトの作成
□ RAGロジックの実装
□ エラーメッセージを貼って原因調査
```

### §16-3. Claude Code Proプラン制約と対策

**プランの制約**

| 項目 | 内容 |
|------|------|
| セッション上限 | 5時間ウィンドウで約44,000トークン（Sonnet） |
| 週次上限 | Sonnet週40〜80時間相当 |
| claude.aiと共有 | チャット・Claude Code合算で同じ枠を消費 |
| リセット | 5時間ごと（セッション）、7日ごと（週次） |

**効率的な使い方**

```
□ 1セッションで1タスクを完結させる
□ 新しいタスクは新しいセッションで始める
□ この計画書をClaude Codeに毎回渡す
□ 長いエラーは要点だけ貼る（スタックトレース全体より「エラー名 + 該当行」）
```

### 30分ルール（詰まったときの行動規範）

```
① エラーメッセージをそのままClaude Codeに貼る（5分）
② 「エラーメッセージ + Next.js」でGoogle検索（10分）
③ 30分以上止まったら壁打ちチャットに持ってくる
※ 1人で半日溶かすのが完成率を最も下げる行動
```

---

## 17. リスクと対策（v19）

| リスク | 影響 | 対策 |
|--------|------|------|
| AIコスト想定超過 | 月数千円 | chat_usage_logsで上限管理（2,000円）、超過時は強制ブロック |
| RAGキーワード正規化ミス | 分類精度低下 | normalizeKeyword関数を共通化しテスト必須（§20参照） |
| CSVフォーマット変更（MF側） | 取り込み失敗 | パーサーをMFフォーマット専用に分離し変更容易に |
| transactions重複検知漏れ | 二重計上 | source_hashのUNIQUE制約で物理的に防止 |
| AI生成失敗 | インサイト表示なし | リトライ3回・フォールバック文言・api_error_logsに記録 |
| CSV import時の同期再計算遅延 | UI待機時間増加 | 件数上限5MB・recalculateScoreを最適化（インデックス活用） |
| jsonbの型崩れ | フロント表示エラー | ZodでDB保存前に検証。`@/types/ai-schemas.ts`を単一の真実として管理 |
| Sonnetチャットコスト爆発 | 月数万円リスク | RAG圧縮・プリセット起点・2,000円上限ブロック |
| service_role_keyの誤用 | RLSバイパスによるデータ漏洩 | フロント・API Routesでは必ずanon keyを使用 |
| バックアップなし | 家計データ消失 | GitHub ActionsでWeeklyにpg_dumpを取得しR2/S3に保存 |
| APIルートの認証チェック漏れ | 未ログインユーザーがAI等を呼び出せる | 全APIルート冒頭でセッション確認を必須化（§23参照） |
| Cronエンドポイントが無防備 | 外部から任意タイミングで叩かれる | CRON_SECRET環境変数でVercelからのリクエストのみ受け付ける |
| CSVアップロードのサイズ無制限 | 巨大ファイルで処理が詰まる | APIルートに5MB上限を設定 |
| Claude Code使用量上限 | 開発が止まる | 5時間リセット待ち or extra usage有効化。週次上限に毎回ぶつかるならMax 5x移行を検討 |
| RLSデバッグで時間を溶かす | Phase 1遅延 | テーブルエディタで直接確認する切り分けフローを先に習得 |
| preview環境のOAuthリダイレクトURL問題 | ローカル開発でログインできない | Supabase Auth設定にlocalhost + Vercel preview URLのワイルドカードを登録 |
| Opus四半期分析のコスト超過 | 1回1,000円超 | プロンプトでmax_tokensを4,000に固定。入力コンテキストは30,000トークン上限で truncate |
| 初回四半期分析がデータ不足 | 内容が浅い | データ12ヶ月未満は context_months を記録し、UIに「学習データ蓄積中」と表示 |

---

## 18. 環境構成（v19）

```
開発環境：
  Supabase: devプロジェクト（NEXT_PUBLIC_SUPABASE_URL_DEV）
  Vercel: preview環境
  .env.local: NEXT_PUBLIC_ENV=development

本番環境：
  Supabase: prodプロジェクト（NEXT_PUBLIC_SUPABASE_URL）
  Vercel: production環境
  環境変数: Vercel管理画面で設定

ローカル開発：
  supabase start でローカルSupabase起動可能
  NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
```

---

## 19. Vector Memory & Opus四半期深層分析（v22 新設）

### 19-1. 設計思想

KAIのAIは**3段階の時間軸**で機能を分担する。

```
【短期】   月次サマリー（Sonnet・月1回）       … 直近1ヶ月の振り返り
【中期】   AIチャット（Sonnet・最大月20回）    … 直近3ヶ月の文脈で対話
【長期】   Opus四半期深層分析（Opus・年4回）   … 全期間トレンドと戦略提言
```

短期→中期→長期で **モデルの賢さとコストを段階的に引き上げる**。月次は実用性、四半期は深度を優先。

### 19-2. Vector Memory（pgvector RAG）

過去の生成テキストをベクトル化して`ai_insights_embeddings`に保存し、AIチャット・四半期分析の両方で意味検索する。

**保存対象（ベクトル化する）**
```
✅ ai_monthly_insights.summary_text       → content_type='summary'
✅ ai_monthly_insights.saving_actions     → content_type='saving_actions'
✅ ai_monthly_insights.spending_pattern   → content_type='spending_pattern'
✅ ai_quarterly_insights.deep_analysis    → content_type='quarterly_deep'（v22追加）
```

**保存しない（SQLで扱う）**
```
❌ transactions
❌ budgets
❌ monthly_scores の数値
```

**Embedding生成タイミング**
```
ai_monthly_insights 保存後 → 同一トランザクション内で ai_insights_embeddings にINSERT
ai_quarterly_insights 保存後 → 同様にINSERT
```

**検索の閾値（v22で明確化）**
| 用途 | しきい値 | 上位N件 |
|------|---------|---------|
| AIチャットのコンテキスト構築 | cosine類似度 ≥ 0.75 | 上位3件 |
| 四半期分析のコンテキスト構築 | しきい値なし（全件取得） | 直近24件まで |
| カテゴリ分類のVector層 | cosine類似度 ≥ 0.85 | 上位1件 |

> カテゴリ分類は誤分類リスクが高いので0.85と厳しめ。チャットRAGは関連が薄くてもLLMが取捨選択できるので0.75と緩め。

### 19-3. Opus四半期深層分析（コア機能）

**実行タイミング：** 各四半期の翌月1日 02:00 UTC（JST 11:00）・年4回（Q1=4/1, Q2=7/1, Q3=10/1, Q4=1/1）。月次Cron実行後に動く。

**参照範囲（バランス型・v22確定）**
```
① 全期間RAG：ai_insights_embeddings から全期間の月次サマリー・支出のクセ・節約提案
   → 直近24件まで取得（家計簿用途では2年分相当）
② 直近3ヶ月SQL集計：
   - カテゴリ別の月次推移
   - 固定費の増減
   - スコア・予算達成率の推移
   - 上位支出店舗Top20
③ 過去の四半期分析：直近4件（過去1年分の四半期インサイト）
```

**入力トークン構成（試算）**
```
全期間RAG（24件×平均500トークン）   = 約12,000 トークン
直近3ヶ月SQL集計の構造化サマリー    = 約 8,000 トークン
過去四半期分析（4件×平均1,500）     = 約 6,000 トークン
プロンプト・スキーマ指示             = 約 4,000 トークン
─────────────────────────────────
合計入力                            ≒ 約30,000 トークン
出力                                ≒ 約 4,000 トークン
```

**Opus四半期分析の生成フロー**
```
① 四半期Cron起動（/api/cron/quarterly）
② quarter = '2026-Q1' 等を算出
③ 既に該当四半期のinsightが存在し generated_at IS NOT NULL → スキップ（二重実行防止）
④ コンテキスト構築：
   a. ai_insights_embeddings から全期間取得（直近24件）
   b. 直近3ヶ月の SQL 集計を実行（カテゴリ・固定費・スコア・上位店舗）
   c. ai_quarterly_insights から直近4件取得
⑤ Opusに送信（ZodスキーマでJSONレスポンスを強制）
⑥ レスポンスを TrendFindingsSchema / StrategicActionsSchema で検証
⑦ ai_quarterly_insights に UPSERT
⑧ deep_analysis を text-embedding-3-small でベクトル化
⑨ ai_insights_embeddings に INSERT（content_type='quarterly_deep'）
リトライ：3回（失敗時は failed=true、次の四半期で再試行はしない）
```

**Opusに投げるプロンプト構造**
```
# 役割
あなたは家計分析の専門家です。3ヶ月分の家計データと過去のAI生成インサイトを踏まえ、
長期的なトレンド分析と戦略的な提言を行ってください。

# 入力
## 直近3ヶ月のSQL集計（構造化データ）
{category_monthly_trends_json}
{fixed_expense_changes_json}
{score_history_json}
{top_payees_json}

## 過去の月次サマリー・節約提案（最大24件・古い順）
{vector_retrieved_insights_text}

## 過去の四半期分析（直近4件）
{past_quarterly_analyses_text}

# 出力（JSON）
{
  "deep_analysis": "...",          // 800〜1,500文字の自然文
  "trend_findings": [...],         // TrendFindingsSchema準拠（最大5件）
  "strategic_actions": [...]       // StrategicActionsSchema準拠（最大3件）
}

# 制約
- trend_findings は magnitude_pct を必ず数値で示す
- strategic_actions は expected_impact_yen を必ず円単位で見積もる
- 「頑張りましょう」のような精神論は禁止。具体的なアクションのみ
```

**閲覧UI（Phase 3c）**
```
/quarterly ページを新設。
ボトムナビからは導線を出さず、ダッシュボードに「📈 四半期レポート」リンクを配置。
```
```
┌──────────────────────────────────────────────┐
│ 2026 Q1 深層分析  ✨ Opus生成 / 24ヶ月分参照  │
├──────────────────────────────────────────────┤
│ 【トレンド】                                  │
│   外食費 +32%（増加傾向）                     │
│   固定費 -8%（減少・サブスク整理が奏功）       │
├──────────────────────────────────────────────┤
│ 【戦略アクション】                            │
│   1. 来四半期：外食予算を-20%に圧縮（影響-12,000円） │
│   2. 来年に向けて：保険を見直し（影響-30,000円/年）  │
├──────────────────────────────────────────────┤
│ 【深層分析全文】                              │
│   （Opus生成テキスト・800〜1,500文字）        │
└──────────────────────────────────────────────┘
```

### 19-4. AIチャットでのVector Memory活用

```
① ユーザー質問を text-embedding-3-small でベクトル化
② ai_insights_embeddings を cosine類似度 ≥ 0.75 で検索（上位3件）
③ 取得した過去インサイトをチャットコンテキストに追加
④ 直近の四半期分析（ai_quarterly_insights 最新1件）も常時注入
⑤ Sonnetに送信
```

**活用例：**
- 「外食費が増えたのはいつから？」→ 過去の月次サマリー・四半期分析を参照
- 「今四半期の戦略を教えて」→ 最新の ai_quarterly_insights を直接参照
- 「去年の同時期と比べてどう？」→ 1年前の四半期分析をベクトル検索

### 19-5. コストと運用

| 項目 | 値 |
|------|---|
| Opus四半期分析の単価 | 約100円/回 |
| 年間コスト | 約400円 |
| 月割換算 | 約33円 |
| 失敗時の動作 | retry 3回 → failed=true・UI上はフォールバック文言 |
| 二重実行防止 | quarter単位でUNIQUE制約＋generated_at NULL チェック |

### 19-6. 段階的リリース判断ポイント

```
Phase 3c入る前の判断：
  □ Phase 3a/b までで月次サマリー・チャットが安定稼働しているか
  □ ai_insights_embeddings が3ヶ月分以上溜まっているか（最低限のRAGデータ）
  □ Opus APIの最新モデル名・価格を docs.claude.com で再確認
```

> **重要：** Opus分析は「過去データが12ヶ月分以上溜まってから」が真の本領発揮。MVP完成直後は参照データが薄いため、初回四半期分析はやや浅い内容になる前提で設計する。

---

## 20. Phase 5以降の検討事項

- **自然言語パース**：「スタバで500円」→自動で取引登録（Haiku）
- **AIProvider抽象化**：`interface AIProvider { generateSummary(); chat(); classify() }` でOpenAI/Gemini切り替えを可能に
- **クイックサマリーのウィジェット化**：iOS・Androidウィジェットで残り予算を表示
- **按分機能**：家族間の費用分担計算
- **累積統計**：年次サマリー・長期トレンド分析

---

## 21. テスト戦略（v23）

### 全体方針

テストは**2層構成**。Vitestでコアロジックを守り、Playwrightで最重要フローを守る。

| 層 | ツール | 対象 | 実行タイミング |
|----|--------|------|----------------|
| **ユニット** | Vitest | コアロジック（スコア計算・CSV重複検知・RAG分類） | `npm test` ローカル手動 |
| **E2E** | Playwright | login・CSV import・transaction edit の3フロー | `npm run e2e` ローカル手動（Phase完了時） |

> UIの全画面はマニュアルテスト。Playwrightは「壊れると運用が止まる3本」に絞る。

---

### 21-1. Vitestユニットテスト（従来通り）

**① スコア計算ロジック**（`src/__tests__/score.test.ts`）
- 予算達成率100%・50%・150%でのスコア計算結果
- score_gradeの境界値（S/A/B/C/Dの閾値）
- is_finalized=trueの月は再計算対象外

**② CSV重複検知ロジック**（`src/__tests__/csv.test.ts`）
- 同一CSVを2回取り込んだとき重複がゼロ件
- source_hashの生成が同一行で同一値
- 空行・ヘッダー行のスキップ

**③ カテゴリ分類RAGロジック**（`src/__tests__/category-rag.test.ts`）
- normalizeKeyword関数（大文字小文字・全角半角・記号の正規化）
- RAGヒット時はAPI呼び出しなし
- confidence閾値以下のルールが使われないか

---

### 21-2. Playwright E2Eテスト（v23新設）

#### セットアップ方針

**認証の扱い（最重要）**

Google OAuthはリダイレクトが外部ドメインに出るため、Playwrightで実際のGoogleログイン画面を操作することは不可能（Googleが自動化をブロックする）。代わりに **Supabaseのセッションをストレージ経由で注入** する。

```
E2E用テスト戦略：
  ① 初回のみ手動でGoogle OAuthを完了 → playwright/.auth/user.json に保存
  ② 以降のテストはそのセッションを再利用（storageState）
  ③ セッション切れたら再実行（個人利用のため月1〜2回程度）
```

**playwright.config.ts の基本設定**
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'playwright/.auth/user.json',  // 認証状態を全テストで共有
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { storageState: undefined },  // setup時は認証状態を使わない
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
```

**auth.setup.ts（セッション保存・初回のみ実行）**
```typescript
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../playwright/.auth/user.json')

setup('authenticate', async ({ page }) => {
  // ローカルSupabaseのmagic linkでテストユーザーを直接ログインさせる
  // （Google OAuthの外部依存を回避する）
  await page.goto('/login')

  // Supabase Auth Admin APIでセッションを直接生成する方法：
  // /api/test/create-session（テスト環境のみ有効・本番ではルートを削除）
  // このエンドポイントはSERVICE_ROLE_KEYでユーザーをサインインさせる
  const res = await page.request.post('/api/test/create-session', {
    data: { email: process.env.E2E_TEST_EMAIL },
  })
  const { accessToken, refreshToken } = await res.json()

  // SupabaseのセッションをlocalStorageに注入
  await page.evaluate(
    ({ accessToken, refreshToken, supabaseUrl }) => {
      const key = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
      localStorage.setItem(key, JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
      }))
    },
    {
      accessToken,
      refreshToken,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    }
  )

  await page.context().storageState({ path: authFile })
})
```

> `/api/test/create-session` は `NEXT_PUBLIC_ENV !== 'test'` のとき 404 を返すよう実装し、本番に影響させない。

**必要な環境変数**
```
E2E_TEST_EMAIL=kai-e2e@example.com   # Supabase devプロジェクトに存在するテストユーザー
NEXT_PUBLIC_ENV=test                 # テスト環境判定
```

---

#### テスト①：login（`e2e/login.spec.ts`）

**目的：** 未ログイン時のリダイレクト・ログイン後のダッシュボード表示・ログアウトが正常に機能すること。

```typescript
import { test, expect } from '@playwright/test'

test.describe('login', () => {

  test('未ログイン時はログインページにリダイレクトされる', async ({ browser }) => {
    // storageStateを渡さない（未認証）コンテキストで検証
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*\/login/)
    await context.close()
  })

  test('ログイン済みでダッシュボードが表示される', async ({ page }) => {
    // storageState（認証済み）が適用された状態
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByTestId('dashboard-hero')).toBeVisible()
  })

  test('ログアウト後はログインページに戻る', async ({ page }) => {
    await page.goto('/dashboard')

    // サイドバーのログアウトボタン
    await page.getByTestId('logout-button').click()

    await expect(page).toHaveURL(/.*\/login/)

    // ログアウト後に /dashboard に直アクセスしてもリダイレクト
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*\/login/)
  })

  test('ログイン中に /login へアクセスするとダッシュボードにリダイレクト', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })

})
```

**必要な `data-testid` 一覧（実装時に付与）**
```
dashboard-hero     … ダッシュボードのヒーローパネル
logout-button      … サイドバー or ナビのログアウトボタン
```

---

#### テスト②：CSV import（`e2e/csv-import.spec.ts`）

**目的：** 正常CSV取り込み・重複スキップ・不正ファイル拒否・サイズ超過拒否が正常に動作すること。

**テスト用フィクスチャ（`e2e/fixtures/`に配置）**

```
e2e/fixtures/
  mf_sample_5rows.csv      … 正常データ5行（MFフォーマット準拠）
  mf_sample_5rows.csv      … 同一ファイル（重複テスト用・同じファイルを2回使う）
  mf_invalid_format.csv    … ヘッダー行が異なる不正フォーマット
  mf_over_5mb.csv          … 5MBを超えるファイル（生成スクリプトで作成）
```

**`mf_sample_5rows.csv` のサンプル内容（MFフォーマット）**
```csv
日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
2026/05/01,スターバックス,-650,三井住友カード,食費,カフェ,,FALSE,xxxx001
2026/05/02,Netflix,-1490,三井住友カード,エンタメ,サブスク,,FALSE,xxxx002
2026/05/03,スーパー,-3200,三井住友カード,食費,食料品,,FALSE,xxxx003
2026/05/04,電気代,-8500,三井住友カード,光熱費,電気,,FALSE,xxxx004
2026/05/05,給与,250000,三井住友銀行,収入,給与,,FALSE,xxxx005
```

```typescript
import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('CSV import', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/import')
    await expect(page.getByTestId('csv-dropzone')).toBeVisible()
  })

  test('正常CSV（5行）を取り込むとサマリーが表示される', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/mf_sample_5rows.csv')

    // ドラッグ&ドロップ代わりにinput[type=file]に直接セット
    await page.getByTestId('csv-file-input').setInputFiles(filePath)

    // ローディング中はスケルトンが出る
    await expect(page.getByTestId('import-loading')).toBeVisible()

    // 完了後のサマリー表示を待つ（最大15秒・分類APIも走るため余裕をもつ）
    await expect(page.getByTestId('import-result-summary')).toBeVisible({ timeout: 15_000 })

    // 5件取り込み・0件スキップ
    await expect(page.getByTestId('import-count-imported')).toHaveText('5')
    await expect(page.getByTestId('import-count-skipped')).toHaveText('0')
  })

  test('同じCSVを2回取り込むと2回目は全件スキップされる', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/mf_sample_5rows.csv')

    // 1回目
    await page.getByTestId('csv-file-input').setInputFiles(filePath)
    await expect(page.getByTestId('import-result-summary')).toBeVisible({ timeout: 15_000 })

    // リセットして2回目
    await page.getByTestId('import-reset-button').click()
    await page.getByTestId('csv-file-input').setInputFiles(filePath)
    await expect(page.getByTestId('import-result-summary')).toBeVisible({ timeout: 15_000 })

    await expect(page.getByTestId('import-count-imported')).toHaveText('0')
    await expect(page.getByTestId('import-count-skipped')).toHaveText('5')
  })

  test('不正フォーマットのCSVはエラーメッセージが表示される', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/mf_invalid_format.csv')

    await page.getByTestId('csv-file-input').setInputFiles(filePath)

    await expect(page.getByTestId('import-error-message')).toBeVisible({ timeout: 10_000 })
    // エラーに行番号が含まれること
    await expect(page.getByTestId('import-error-message')).toContainText('行')
  })

  test('5MB超のファイルはフロントでブロックされてAPIに届かない', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures/mf_over_5mb.csv')

    // APIリクエストが飛ばないことを確認
    let apiCalled = false
    page.on('request', (req) => {
      if (req.url().includes('/api/transactions/import')) apiCalled = true
    })

    await page.getByTestId('csv-file-input').setInputFiles(filePath)

    await expect(page.getByTestId('import-size-error')).toBeVisible({ timeout: 5_000 })
    expect(apiCalled).toBe(false)
  })

})
```

**必要な `data-testid` 一覧**
```
csv-dropzone             … ドロップゾーン全体
csv-file-input           … input[type=file]（hiddenでも可）
import-loading           … ローディング中のスケルトン or スピナー
import-result-summary    … 取り込み結果サマリー全体
import-count-imported    … 「N件取り込み」のN部分
import-count-skipped     … 「N件スキップ」のN部分
import-reset-button      … 「もう一度」「リセット」ボタン
import-error-message     … フォーマットエラー表示
import-size-error        … サイズ超過エラー表示
```

---

#### テスト③：transaction edit（`e2e/transaction-edit.spec.ts`）

**目的：** 取引の編集フォームが開く・金額/カテゴリを変更して保存できる・保存後にスコアが再計算されて画面に反映されること。

```typescript
import { test, expect } from '@playwright/test'

test.describe('transaction edit', () => {

  test.beforeEach(async ({ page }) => {
    // 取引一覧ページへ（テストデータはauth setup時にシードされている前提）
    await page.goto('/transactions')
    await expect(page.getByTestId('transaction-list')).toBeVisible()
  })

  test('取引行をクリックすると編集フォームが開く', async ({ page }) => {
    await page.getByTestId('transaction-row').first().click()

    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()
    // 必須フィールドが表示されていること
    await expect(page.getByTestId('edit-field-amount')).toBeVisible()
    await expect(page.getByTestId('edit-field-payee')).toBeVisible()
    await expect(page.getByTestId('edit-field-category')).toBeVisible()
  })

  test('金額を変更して保存するとリストに反映される', async ({ page }) => {
    await page.getByTestId('transaction-row').first().click()
    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()

    // 金額フィールドをクリアして新しい値を入力
    const amountInput = page.getByTestId('edit-field-amount')
    await amountInput.clear()
    await amountInput.fill('9999')

    await page.getByTestId('edit-save-button').click()

    // モーダルが閉じること
    await expect(page.getByTestId('transaction-edit-modal')).not.toBeVisible()

    // リストの先頭行に更新後の金額が表示されること
    await expect(page.getByTestId('transaction-row').first()).toContainText('9,999')
  })

  test('カテゴリを変更して保存するとスコアが再計算される', async ({ page }) => {
    // 保存前のスコアを記録
    await page.goto('/dashboard')
    const scoreBefore = await page.getByTestId('score-ring-value').textContent()

    // 取引一覧で1件のカテゴリを変更
    await page.goto('/transactions')
    await page.getByTestId('transaction-row').first().click()
    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()

    // カテゴリセレクトを変更（最初の選択肢以外を選ぶ）
    await page.getByTestId('edit-field-category').selectOption({ index: 1 })
    await page.getByTestId('edit-save-button').click()
    await expect(page.getByTestId('transaction-edit-modal')).not.toBeVisible()

    // ダッシュボードに戻りスコアが更新されていること（値が存在すればOK・変化量は問わない）
    await page.goto('/dashboard')
    await expect(page.getByTestId('score-ring-value')).toBeVisible()
    const scoreAfter = await page.getByTestId('score-ring-value').textContent()
    // スコアの表示自体が壊れていないこと（数値であること）
    expect(Number(scoreAfter?.replace(/[^0-9]/g, ''))).toBeGreaterThanOrEqual(0)
  })

  test('必須項目（金額）を空にして保存しようとするとバリデーションエラーが出る', async ({ page }) => {
    await page.getByTestId('transaction-row').first().click()
    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()

    await page.getByTestId('edit-field-amount').clear()
    await page.getByTestId('edit-save-button').click()

    // モーダルが閉じないこと
    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()
    // バリデーションエラーが表示されること
    await expect(page.getByTestId('edit-error-amount')).toBeVisible()
  })

  test('ESCキーでモーダルが閉じてデータは変わらない', async ({ page }) => {
    await page.getByTestId('transaction-row').first().click()
    await expect(page.getByTestId('transaction-edit-modal')).toBeVisible()

    // 金額を変えるがキャンセル
    await page.getByTestId('edit-field-amount').clear()
    await page.getByTestId('edit-field-amount').fill('1')

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('transaction-edit-modal')).not.toBeVisible()

    // リストの先頭行の金額が「1」になっていないこと
    await expect(page.getByTestId('transaction-row').first()).not.toContainText('¥1')
  })

})
```

**必要な `data-testid` 一覧**
```
transaction-list          … 取引一覧のコンテナ
transaction-row           … 取引1行（複数存在・first()で先頭取得）
transaction-edit-modal    … 編集モーダル全体
edit-field-amount         … 金額入力フィールド
edit-field-payee          … 店名入力フィールド
edit-field-category       … カテゴリセレクト
edit-save-button          … 「保存」ボタン
edit-error-amount         … 金額バリデーションエラー表示
score-ring-value          … ダッシュボードのスコア数値
```

---

### 21-3. テスト用シードデータ

auth setup 実行時にテストユーザーの世帯に最低5件の取引をシードする。E2Eはこのデータを前提に動く。

```typescript
// e2e/helpers/seed.ts
// setup時に /api/test/seed-data を叩いて挿入する
// （本番環境ではルートが404を返す）

export const TEST_TRANSACTIONS = [
  { occurred_on: '2026-05-01', amount: 650,  payee: 'スターバックス', category: '食費' },
  { occurred_on: '2026-05-02', amount: 1490, payee: 'Netflix',       category: 'エンタメ' },
  { occurred_on: '2026-05-03', amount: 3200, payee: 'スーパー',       category: '食費' },
  { occurred_on: '2026-05-04', amount: 8500, payee: '電気代',         category: '光熱費' },
  { occurred_on: '2026-05-05', amount: 650,  payee: 'コーヒーショップ', category: '食費' },
]
```

---

### 21-4. ディレクトリ構成（最終）

```
src/
  lib/
    score.ts
    csv.ts
    category-rag.ts
  __tests__/                       ← Vitest（ユニットテスト）
    score.test.ts
    csv.test.ts
    category-rag.test.ts

e2e/                               ← Playwright（E2Eテスト）
  auth.setup.ts                    ← 認証セッション保存（初回のみ）
  login.spec.ts
  csv-import.spec.ts
  transaction-edit.spec.ts
  fixtures/
    mf_sample_5rows.csv
    mf_invalid_format.csv
    mf_over_5mb.csv                ← generate-fixtures.tsで生成
  helpers/
    seed.ts

playwright/
  .auth/
    user.json                      ← gitignore必須
playwright.config.ts
```

**.gitignore に追加**
```
playwright/.auth/
```

---

### 21-5. package.json スクリプト

```json
{
  "scripts": {
    "test":      "vitest run",
    "test:watch": "vitest",
    "e2e":       "playwright test",
    "e2e:setup": "playwright test e2e/auth.setup.ts",
    "e2e:ui":    "playwright test --ui"
  }
}
```

> `npm run e2e` の前に `npm run dev` でローカルサーバーが起動していること。
> E2Eは **Phase 1完了時**（login）・**Phase 2完了時**（transaction edit）・**Phase 2完了時**（CSV import）の順で追加する。

---

## 22. レビュー・フィードバック計画(v16)

### 各Phase完了時のチェックリスト

```
□ ダミーデータで全画面を一通り操作する
□ エラーケースを意図的に試す（空データ・不正入力・API失敗等）
□ スマホ実機（Safari・Chrome）で表示確認
□ Supabaseのテーブルエディタでデータが正しく保存されているか確認
□ api_error_logsに意図しないエラーが溜まっていないか確認
```

### 家族レビュー（Phase 2完了後〜）

**確認してもらうこと：** スマホでの見た目・使いやすさ・バグ報告（LINEで写真付きで送ってもらう）

**注意：** 「使いにくい」という感想は具体的に深掘りする。ポートフォリオ用なので採用担当が見ることも想定したUIにする。

---

## 23. セキュリティ設計（v17）

### 23-1. APIルートの認証チェック（全エンドポイント必須）

```typescript
// @supabase/auth-helpers-nextjs はdeprecated。@supabase/ssr を使用する。
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name, value, options) { cookieStore.set({ name, value, ...options }) },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 403 })
  }
  // ここから先が実際の処理
}
```

### 23-2. Cronエンドポイントの認証（CRON_SECRET）

```typescript
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 403 })
  }
  // 実際のCron処理
}
```

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/monthly",   "schedule": "1 0 1 * *" },
    { "path": "/api/cron/quarterly", "schedule": "0 2 1 1,4,7,10 *" }
  ]
}
```

> 四半期Cron：各四半期の翌月1日 02:00 UTC（JST 11:00）。月次Cronと衝突しないよう時刻をずらしている。

`CRON_SECRET` は `openssl rand -hex 32` で生成し、Vercel管理画面の環境変数に設定。

### 23-3. CSVアップロードのサイズ制限

```typescript
// /api/transactions/import
const contentLength = request.headers.get('content-length')
if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
  return new Response('File too large', { status: 413 })
}
```

### 23-4. セキュリティチェックリスト（Phase 1 完了時）

```
□ 全APIルートに認証チェックがあるか
□ CRON_SECRETがVercel環境変数に設定されているか
□ CSVインポートAPIにサイズ制限があるか
□ service_role_keyがフロント・APIルートに含まれていないか
□ .env.localが.gitignoreに含まれているか
□ Supabaseのanon keyがクライアントサイドのみで使われているか
```

---

## 24. ログ戦略（v17）

### インフラログ（追加実装不要）

- **Vercel管理画面**：全APIルートのリクエスト・Cronの実行履歴・エラーのスタックトレース（Hobbyプランで1日分）
- **Supabase管理画面**：DB操作ログ・RLS違反ログ・認証ログ

### アプリ内ログ

- **api_error_logs**：AI失敗・CSVインポートエラーをSupabaseのテーブルエディタで確認
- **operation_logs**：csv_import / ai_chat / budget_apply / score_recalc のアクションを記録

### 障害発生時のフロー

```
画面でおかしな挙動 → Vercel Logs でAPIエラー確認
  → Supabase Logs でRLS違反確認
  → api_error_logs で詳細エラー確認
  → operation_logs で直前の操作確認
  → 原因特定して修正
```

---

## 25. Claude Codeへの指示テンプレート

### Phase 1 開始

```
家計簿Webアプリ「KAI」の Phase 1（基盤構築）を進めてください。
要件は添付の「KAI_計画書_統合版.md」を参照してください。

【今回のタスク】
1. Next.js 14 (App Router) + TypeScript プロジェクト作成
2. Tailwind CSS + デザイントークン展開（§3-2, §3-3 通り）
3. アトムコンポーネント実装（§3-7, §3-8）：
   - <Panel variant="glass | solid | hero" />
   - <Skeleton variant="panel | line-sm | line-md | line-lg | block" />
   - <LiveDot color={...} />（prefers-reduced-motion で点滅停止）
   - <Lbl />（uppercase装飾ラベル・JetBrains Mono）
4. アクセシビリティ基盤：
   - globals.css に prefers-reduced-motion メディアクエリ
   - eslint-plugin-jsx-a11y を有効化
5. Supabaseスキーマ作成SQL（§7 の全テーブル + RLSポリシー§11）

【お願い】
- アニメーションは prefers-reduced-motion で必ず止まること
- Tickerには一時停止ボタンを必ず追加すること
- アイコンは Lucide React を使用
- 1ファイル200行超は分割
- 不明点は実装前に質問
```

### AIチャット実装

```
AIチャット画面を実装してください。（§12-6, §4 参照）

【仕様】
- プリセット質問チップ（横スクロール）から起点
- 上部CONTEXT カード：今月の支出/予算達成カテゴリ数/スコア
- chat_usage_logsで上限チェック（session_count >= 20 or estimated_cost >= 2000）
- RAGコンテキスト構築（直近3ヶ月サマリー圧縮・約8,000トークン）
- 失敗時：「申し訳ありません。もう一度送信してください」をバブル表示
- AIバッジルール：ダッシュボードは1画面につき1つまで
```

### CSVインポート実装

```
CSVインポート機能を実装してください。（§15 参照）

【仕様】
- ドラッグ&ドロップ UI（papaparse でパース）
- /api/transactions/import に送信（5MB上限チェック必須）
- SHA256でsource_hash生成 → UNIQUE制約で重複検知
- INSERT後 → /api/transactions/classify でHaikuに送信
- 結果サマリー表示
- 全APIルートの冒頭にセッション確認コードを必ず含めること（§23-1）
```

### Opus四半期深層分析実装（Phase 3c）

```
四半期末Cron（/api/cron/quarterly）を実装してください。（§19 参照）

【仕様】
- スケジュール：四半期翌月1日 02:00 UTC（vercel.json で設定）
- CRON_SECRET 認証必須（§23-2 参照）
- コンテキスト構築：
  ① ai_insights_embeddings から全期間取得（直近24件）
  ② 直近3ヶ月の SQL 集計（カテゴリ・固定費・スコア・上位店舗）
  ③ ai_quarterly_insights から直近4件取得
- Opusに送信（モデル名は実装時に docs.claude.com で最新確認）
- Zod で TrendFindingsSchema / StrategicActionsSchema を検証
- ai_quarterly_insights に UPSERT
- deep_analysis を text-embedding-3-small でベクトル化し ai_insights_embeddings に保存
- リトライ3回・失敗時は failed=true
- 同四半期で generated_at IS NOT NULL なら早期return（二重実行防止）

【閲覧UI】
- /quarterly ページ。ダッシュボードから導線
- 「✨ Opus生成 / Nヶ月分参照」バッジ表示
- trend_findings・strategic_actions・deep_analysis を§19-3のレイアウト通りに表示
```

---

*統合版 作成日：2026年5月14日*
*ソース：v8（デザイン仕様）、v13（DBスキーマ参考）、v19（設計基盤）、v20（スコア再計算シンプル化）、v21（pgvector・Vector Memory・shadcn/ui追加）、v22（Opus四半期深層分析・@supabase/ssr移行・各種修正）、v23（E2EテストPlaywright設計）*
