# Dependency Audit — KAI 家計簿ダッシュボード

> 生成日: 2026-05-24

---

## Used in Production

| パッケージ | 用途 | 重要度 |
|-----------|------|--------|
| `next` 16.2.6 | フレームワーク | 必須 |
| `react` 19.2.4 | UI | 必須 |
| `react-dom` 19.2.4 | UI | 必須 |
| `@supabase/ssr` | SSR 対応 Supabase クライアント | 必須 |
| `@supabase/supabase-js` | Supabase SDK | 必須 |
| `@anthropic-ai/sdk` | Claude API | 必須 |
| `@tanstack/react-query` | サーバー状態管理 | 必須 |
| `zod` | スキーマ検証 | 必須 |
| `tailwind-merge` | Tailwind class マージ | 必須 |
| `class-variance-authority` | CVA（コンポーネント変分） | 必須 |
| `clsx` | CSS class 結合 | 必須 |
| `lucide-react` | アイコン | 必須 |
| `next-themes` | テーマ管理（ダーク/ライト） | 必須 |
| `papaparse` | CSV パース（MF取込み） | 必須 |
| `recharts` | グラフ表示（予算・スコア） | 必須 |
| `react-markdown` | AI サマリーの Markdown レンダリング | 必須 |
| `web-push` | Web Push 通知送信 | 必須 |
| `onnxruntime-node` | PP-OCRv5 推論エンジン | 必須（OCR） |
| `paddleocr` | PP-OCRv5 JS バインディング | 必須（OCR） |
| `sharp` | レシート画像前処理 | 必須（OCR） |
| `playwright-core` | MF 非公式 API（ブラウザ自動化） | 必須（MF連携） |
| `@sparticuz/chromium-min` | Vercel 用軽量 Chromium | 必須（MF連携） |
| `tw-animate-css` | Tailwind アニメーション拡張 | 必須（デザイン） |

---

## Dev Only（devDependencies — 適切）

| パッケージ | 用途 |
|-----------|------|
| `typescript` | TypeScript コンパイラ |
| `@types/node` / `@types/react` / `@types/react-dom` | 型定義 |
| `@types/papaparse` / `@types/web-push` | 型定義 |
| `tailwindcss` | CSS フレームワーク（ビルド時のみ） |
| `@tailwindcss/postcss` | PostCSS プラグイン |
| `eslint` + `eslint-config-next` | Linter |
| `vitest` + `@vitest/coverage-v8` | テストランナー + カバレッジ |
| `fast-check` | プロパティベーステスト |
| `playwright` | E2E テスト |

---

## Unused または疑問あり

| パッケージ | 判定 | 理由 |
|-----------|------|------|
| `@base-ui/react` | **要確認** | package.json に存在するが、コード中の import が見当たらない。shadcn の依存として自動インストールされた可能性あり。|
| `shadcn` | **開発専用にすべき** | shadcn CLI（`npx shadcn add ...`）はコード生成ツールであり runtime 依存ではない。`devDependencies` へ移動推奨。 |
| `pdf-parse` | **一時的** | 法規PDF抽出スクリプト用。規約ページは更新済みで今後も使う予定がなければ削除可。 |
| `pdfjs-dist` | **一時的** | 同上（`extract_pdf.mjs` 専用）。 |

---

## Replaceable / Heavy Packages

| パッケージ | サイズ問題 | 代替案 |
|-----------|-----------|--------|
| `lucide-react` | 大きいが tree-shaking 有効 | 現状維持。named import のみ使用し問題なし。 |
| `recharts` | ~200KB gzip | 予算・スコアグラフに使用。代替は Chart.js や visx だが移行コスト大。現状維持。 |
| `onnxruntime-node` | ~50MB | OCR 専用サーバーのみ。`serverExternalPackages` 設定済みで bundle に含まれない。 |
| `@sparticuz/chromium-min` | ~40MB | MF 連携専用サーバーのみ。`outputFileTracingIncludes` で管理済み。 |
| `react-markdown` | ~30KB | AI サマリーページのみ使用。必要。 |

---

## Server Only にできるパッケージ

以下は API Route / Server Action でのみ使用されており、クライアントバンドルに含まれていない（`serverExternalPackages` または Dynamic Import 経由）:

- `onnxruntime-node` — OCR API Route のみ
- `paddleocr` — OCR API Route のみ
- `sharp` — OCR API Route のみ
- `playwright-core` + `@sparticuz/chromium-min` — MF Sync API Route のみ
- `web-push` — Push API Route / Cron のみ
- `@anthropic-ai/sdk` — AI API Routes のみ

---

## Edge 非対応パッケージ

以下は Node.js ランタイムに依存しており、Edge Runtime では動作しない:

- `onnxruntime-node`（ネイティブバインディング）
- `paddleocr`（同）
- `sharp`（同）
- `playwright-core`（同）
- `@sparticuz/chromium-min`（同）

> ⚠️ これらを使う API Route に `export const runtime = 'edge'` を付けてはいけない。

---

## 推奨アクション

```bash
# 1. @base-ui/react が本当に不要か確認
grep -rn "@base-ui/react" app/ components/ lib/ --include="*.ts" --include="*.tsx"

# 2. shadcn を devDependencies に移動
npm install --save-dev shadcn
npm uninstall shadcn

# 3. 一時パッケージを削除（規約更新が完了していれば）
npm uninstall pdf-parse pdfjs-dist
```

---

## 現在の dependency 健全性スコア

| 項目 | 評価 |
|-----|------|
| 重複パッケージ | ✅ なし |
| 未使用 runtime dep | ⚠️ `@base-ui/react` 要確認、`pdf-parse`/`pdfjs-dist` 一時的 |
| dev/prod 分類ミス | ⚠️ `shadcn` が dependencies に入っている |
| tree-shaking | ✅ lucide-react は named import で問題なし |
| bundle size | ✅ サーバー専用パッケージは `serverExternalPackages` で除外済み |
