# DB運用メモ

スキーマの正本は `supabase/migrations/`。このファイルはそれを補足するメモのみ。

## 主要テーブル（一覧）

households / household_members
transactions / categories / category_rules
budgets / budget_suggestions
monthly_scores / monthly_anomaly_flags
ai_monthly_insights / score_recalc_queue
fixed_expenses / fixed_expense_suggestions
chat_sessions / chat_messages / chat_usage_logs
api_error_logs / operation_logs

## 設計上の注意

- `transactions.amount` は **int**。支出=正・収入=負
- `transactions.source_hash` は SHA256（重複検知用）
- `transactions.occurred_on` は date 型（時刻は持たない）
- `category_rules.confidence` は月初Cronで ×0.95 の自然減衰
- `budget_suggestions` は提案のみ。手動確定で `budgets` に反映
- `monthly_scores.is_finalized=true` は再計算対象外
- `ai_monthly_insights` のフィールド：summary_text / summary_short / saving_actions / spending_pattern

## RLSポリシー（全テーブル必須）

```sql
household_id IN (
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
)
```

## RAGの閾値

- `category_rules.confidence >= 0.8` ならRAGヒット（AI呼び出しスキップ）
- `0.5 <= confidence < 0.8` はAI呼び出しで再検証
- `< 0.5` は無視

## キュー状態遷移

`score_recalc_queue.status`: `pending` → `processing` → `done`
失敗時：`failed` に遷移、`error_message` 記録。3回失敗で `dead` に。
