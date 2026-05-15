# 月初Cron処理（/api/cron/monthly）

毎月1日 00:01 JST 実行。

## 処理順序・依存関係

```
[並列実行可（DB操作のみ）]
① fixed_expenses 当月分自動生成
② monthly_scores.is_finalized → true（前月）
⑥ fixed_expense_suggestions UPSERT（SQL）
⑦ monthly_anomaly_flags 保存（SQL）
⑧ category_rules confidence 自然減衰（×0.95）
⑨ notifications 90日超過分を削除

[順次実行（AI呼び出し・コスト管理）]
③ 月次サマリー生成（Sonnet）→ ai_monthly_insights
④⑤ 予算提案＋支出クセ（Haiku 1回呼び出し）
   → budget_suggestions
   → ai_monthly_insights（UPSERT: household_id, month）

[全完了後]
⑩ Service Worker 経由で月次通知送信
```

## UPSERTキー（重要）

`ai_monthly_insights` への書き込みは必ず：
```sql
ON CONFLICT (household_id, month) DO UPDATE SET ...
```
これがないとデバッグ時に重複行ができてAI再実行が無駄になる。

## is_finalized 解除

`is_finalized=true` の月は再計算対象外。**解除はSQL直接実行のみ**（API化しない）。
誤finalize時の手順：

```sql
UPDATE monthly_scores SET is_finalized = false
WHERE household_id = '...' AND month = '2026-05';
```

## ポーリング設計の理由

`score_recalc_queue` はDBトリガーUPSERT → Cron 5分ポーリング。
Realtime/Queueを使わない理由：**Vercel Queue禁止・Edge Function禁止**のスタック制約のため。
