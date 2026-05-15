# AI呼び出しルール

## モデル選択・上限

| 機能 | モデル | 頻度 | 上限 |
|---|---|---|---|
| 月次サマリー | Sonnet | 月1回 | retry 3回 |
| AIチャット | Sonnet | 月20回/世帯 | 2,000円/月でブロック |
| 予算提案＋支出クセ | Haiku | 月1回（統合呼び出し） | retry 3回 |
| カテゴリ分類 | Haiku | 10件/バッチ、月最大6回 | RAGヒット時はスキップ |

## チャット送信前チェック（OR条件）

```typescript
if (session_count >= 20 || estimated_cost >= 2000) {
  return { error: 'limit_exceeded' }
}
```

## チャットコンテキスト管理（トークン爆発の防止）

- **送信history：直近6ターンのみ**（それ以前はDB保存するが送信しない）
- **system prompt：500トークン以下**（「家計簿アシスタント。以下データを参照して回答」程度）
- ユーザーデータは毎回userメッセージ側にインジェクション（cacheableな構造）

## RAGコンテキスト圧縮（必須）

生データを渡さない。直近3ヶ月の以下に圧縮して **約8,000トークン** に収める：
- カテゴリ別集計
- 予算達成率
- 上位店舗 Top10

## カテゴリ分類のバッチ化

```typescript
// 月60件を10件×最大6バッチで処理
// RAGヒット（confidence ≥ 0.8）の取引はAPI呼び出しをスキップ
// 1回のHaiku呼び出しで10件のJSON配列を返させる
```

## 予算提案＋支出クセの統合呼び出し

Haikuの呼び出しオーバーヘッド削減のため、1回のリクエストで両方をJSONで返させる：

```typescript
// 1回のHaiku呼び出しで { budget_suggestions, spending_pattern } を返す
```

## バリデーション

AIレスポンスは **必ずZodで検証してからDB保存**。型定義は `src/types/ai-schemas.ts` に集約。

検証失敗時はretryではなく、`api_error_logs` 記録 + FALLBACK文言を返す。
