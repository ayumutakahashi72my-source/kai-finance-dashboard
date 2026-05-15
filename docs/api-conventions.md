# API実装規約

## 命名

```
APIルート：/api/{リソース}/{アクション}
  例：/api/transactions/import, /api/ai/chat, /api/cron/score-queue

TanStack Queryキー：['リソース名', household_id, month, ...filters]
  例：['transactions', household_id, '2026-05', { category: 'food' }]

Migrationsファイル：YYYYMMDDHHMMSS_description.sql
```

## 認証ガード（全ルート必須）

```typescript
// src/lib/api-guard.ts に集約
import { requireAuth, requireCron } from '@/lib/api-guard'

// 通常ルート
const session = await requireAuth(request)  // 失敗時は throw → 403

// Cronエンドポイント
requireCron(request)  // Bearer ${CRON_SECRET} 検証

// CSVインポート（追加チェック）
if (parseInt(request.headers.get('content-length') ?? '0') > 5 * 1024 * 1024) {
  return new Response('File too large', { status: 413 })
}
```

## Retry戦略（統一）

すべてのretryは **exponential backoff（1s, 2s, 4s）** に統一。jitterなし。

```typescript
import { retryWithBackoff } from '@/lib/retry'
await retryWithBackoff(() => anthropic.messages.create(...), { maxRetries: 3 })
```

## エラーログ

失敗は `api_error_logs` に記録（route, status, error_message, household_id）。
クライアントには `FALLBACK` 文言を返し、内部詳細は露出しない。

## レスポンス

成功：`Response.json({ data })` / 失敗：`Response.json({ error: 'message' }, { status })`
