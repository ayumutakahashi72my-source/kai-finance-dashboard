# トラブルシューティング

## 30分ルール

1. エラーメッセージをそのまま貼る（5分）
2. 「エラーメッセージ + Next.js」でGoogle検索（10分）
3. 30分超えたら即、壁打ちチャットへ

## RLSでデータが見えない

1. Supabaseテーブルエディタで直接データを確認
2. **DBにある** → フロント問題（クエリキー・キャッシュ・型）
3. **DBにない** → RLS問題（`auth.uid()` がnullの可能性、ポリシー確認）

## AI呼び出しが失敗する

1. `api_error_logs` を確認
2. レート制限：retry-afterヘッダーを見て exponential backoff が効いているか
3. Zodバリデーション失敗：プロンプトのJSON schema指定が正しいか
4. 全失敗時：FALLBACK文言を返す

## Cronが動かない

1. Vercelダッシュボードで Cron logs を確認
2. `CRON_SECRET` のBearer認証が通っているか
3. タイムアウト（10秒制限）：処理を分割

## チャットのコスト超過

`chat_usage_logs.estimated_cost` を集計。月2,000円超ならブロック。
履歴を6ターンに制限しているか確認（`docs/ai-rules.md`）。
