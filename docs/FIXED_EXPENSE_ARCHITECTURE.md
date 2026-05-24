# Fixed Expense Architecture

Date: 2026-05-24

## Overview

固定費候補（fixed_expense_suggestions）は月初 Cron が SQL 集計で自動検出し、
ユーザーが UI から承認（confirmed）または却下（dismissed）する。
承認された候補は将来の予算計算の参考値として使う。

---

## Detection flow

```
月初 Cron (/api/cron/monthly — ステップ⑤)
  ↓
前12ヶ月の transactions を household 単位で集計
  ↓
payee ごとに出現した月数 (months_seen) を集計
  ↓
3ヶ月以上連続で出現した payee を候補に選出
  ↓
canonicalizeMerchant() で名寄せ (例: "NETFLIX.COM" → "Netflix")
  ↓
fixed_expense_suggestions に UPSERT
  (onConflict: 'household_id, payee' → avg_amount と months_seen を更新)
```

トリガー：毎月1日 00:01 JST (Vercel Cron: `"1 15 1 * *"`)

---

## DB schema

```sql
fixed_expense_suggestions (
  id           uuid        PK
  household_id uuid        FK → households
  payee        text        NOT NULL
  avg_amount   integer     NOT NULL       -- 過去出現分の平均（円）
  months_seen  integer     NOT NULL DEFAULT 1
  dismissed    boolean     NOT NULL DEFAULT false
  confirmed_at timestamptz               -- NULL = 未確認, 値あり = 承認済み
  detected_at  timestamptz NOT NULL DEFAULT now()
  updated_at   timestamptz NOT NULL DEFAULT now()
  UNIQUE (household_id, payee)
)
```

RLS: household_members 経由の select/insert/update のみ許可。delete 不可（Cron が再検出するため）。

---

## Confidence rules

現在は SQL ルールベース（LLM 不使用）：

| 条件 | 扱い |
|---|---|
| months_seen ≥ 3 | 候補として表示 |
| months_seen < 3 | Cron が UPSERT しても UI には出ない |
| dismissed = true | 候補一覧で折りたたみ表示 |
| confirmed_at IS NOT NULL | 「登録済み」バッジ表示 |

avg_amount はユーザーへの参考値。予算合計への自動反映は **未実装**（将来対応）。

---

## UI integration points

### FixedExpenseCard (`components/budget/FixedExpenseCard.tsx`)

- `/api/fixed-expenses` GET でリスト取得（TanStack Query, queryKey: `['fixed_expenses']`）
- `/api/fixed-expenses` PATCH で状態変更（楽観的更新なし、invalidateQueries で再取得）
- 表示場所: `app/budget/page.tsx` の `<BudgetDashboard>` 下

**3状態 UI:**

```
active (dismissed=false, confirmed_at=null)
  → 「承認」ボタン (violet) + 「却下」ボタン (danger)

confirmed (confirmed_at IS NOT NULL)
  → 「登録済み」バッジ (green) — ボタンなし

dismissed (dismissed=true)
  → 折りたたみセクション内に表示、「元に戻す」ボタン
```

### API routes

`GET /api/fixed-expenses`
- requireAuth() で認証・household 解決
- avg_amount 降順でソート

`PATCH /api/fixed-expenses`
- body: `{ id: string, dismissed?: boolean, confirmed?: boolean }`
- `dismissed: true` → dismissed=true, confirmed_at=null (承認を取り消す)
- `confirmed: true` → confirmed_at=now(), dismissed=false
- `dismissed: false` → dismissed=false (元に戻す)
- household_id で行スコープを制限 (RLS二重チェック)

---

## False positive mitigation

1. **名寄せ**: `canonicalizeMerchant()` が同一業者の表記揺れを統合
2. **3ヶ月閾値**: 月1回払いを最低3回確認してから候補表示
3. **却下 UI**: ユーザーが誤検出を手動却下、次月の Cron で再 UPSERT されても dismissed は保持される
   - ただし Cron は dismissed をリセットしない設計（UPSERT は avg_amount/months_seen のみ更新）
4. **avg_amount**: 単月の異常値が影響を受けにくい平均値

---

## Known limitations / future work

| 限界 | 優先度 | メモ |
|---|---|---|
| 承認済み候補を予算合計に自動反映していない | Medium | BudgetDashboard の fixed_total フィールド追加が必要 |
| dismissed をリセットするかどうかの Cron ポリシーが未文書化 | Low | 現状: リセットしない（ユーザー意思尊重） |
| months_seen が累計カウントでなく過去12ヶ月スライディングウィンドウでない可能性 | Low | 月初集計ロジックを確認要 |
| ユーザーが payee 名を編集できない | Low | 名寄せミスの修正手段がない |

---

## Data flow diagram

```
transactions テーブル
  ↓ (月初 Cron ⑤, SQL 集計)
fixed_expense_suggestions
  ↓ (GET /api/fixed-expenses)
FixedExpenseCard (TanStack Query)
  ↓ ユーザー操作
  ↓ (PATCH /api/fixed-expenses)
fixed_expense_suggestions (dismissed / confirmed_at 更新)
```

---

## Files

| ファイル | 役割 |
|---|---|
| `supabase/migrations/20260515000013_monthly_scores.sql` | テーブル定義 + RLS |
| `supabase/migrations/20260519000021_fixed_expense_status.sql` | confirmed_at カラム追加 |
| `app/api/cron/monthly/route.ts` | 検出ロジック (ステップ⑤) |
| `app/api/fixed-expenses/route.ts` | GET / PATCH API |
| `components/budget/FixedExpenseCard.tsx` | UI コンポーネント |
| `app/budget/page.tsx` | 配置場所 |
