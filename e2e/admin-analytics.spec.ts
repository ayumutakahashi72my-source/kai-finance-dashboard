/**
 * AI 運用分析ページ E2E テスト
 *
 * 検証範囲:
 * - RAG学習状況セクション（hit_count修正・学習店舗数・LLM削減率）
 * - hit_count分布グラフ
 * - 分類メソッド内訳（7経路の日本語ラベル）
 * - 長期トレンド（スナップショット蓄積中バナー / グラフ表示）
 * - ヘルス基準線（2026-06-17 デプロイ日）
 * - AI インサイトボタン
 * - コンソールエラーなし・API エラー処理
 *
 * 方針:
 * - /api/admin/analytics をモックして決定論的に動作させる
 * - 実際の Supabase・Anthropic API には依存しない
 * - 未認証（E2E_TEST_EMAIL 未設定）の場合は各テストを gracefully skip する
 */

import { test, expect, Page } from '@playwright/test'

// ── モックデータ ──────────────────────────────────────────────────

const MOCK_ANALYTICS_HEALTHY = {
  summary: {
    total: 3200, cacheHits: 2240, hitRate: 0.70,
    totalApiCalls: 380, avgLatency: 820, p95Latency: 2100,
    avgConfidence: 0.891, avgSimilarity: 0.876, sampleSize: 3200,
  },
  methodBreakdown: {
    exact_cache: 1280, regex_rule: 960,
    vector_direct: 320, vector_rerank: 160,
    llm_full: 384, correction: 64, failed: 32,
  },
  dailyStats: [
    { day: '06-10', total: 120, hitRate: 0.65, apiCalls: 12, avgLatency: 780 },
    { day: '06-17', total: 160, hitRate: 0.75, apiCalls: 6,  avgLatency: 700 },
  ],
  lowConfidenceMisses: [{
    created_at: '2026-06-15T10:00:00Z', payee: 'テスト店舗A', payee_key: 'テスト店舗a',
    category_name: '食費', method: 'llm_full', confidence: 0.62, similarity: null, latency_ms: 1200,
  }],
  failedRows: [],
  payeeMissRanking: [],
  categoryConfidence: [
    { category_name: '食費', avg_confidence: 0.920, count: 450 },
    { category_name: '娯楽', avg_confidence: 0.620, count: 80  },
  ],
  ragGrowthCurve: [
    { week: '2026-06-01', total: 280, exactCache: 120, exactCacheRate: 0.43 },
    { week: '2026-06-15', total: 340, exactCache: 187, exactCacheRate: 0.55 },
  ],
  ragStats: {
    totalLearned: 847, highConfidence: 203,
    hitCountDist: { once: 420, twice: 180, threeFour: 130, fiveNine: 80, tenPlus: 37 },
  },
  healthSnapshots: [
    { date: '06-01', cacheRate: 0.43, llmRate: 0.18, failedRate: 0.01, totalClassified: 120, totalLearned: 780, costUsd: 0.0012 },
    { date: '06-15', cacheRate: 0.55, llmRate: 0.12, failedRate: 0.01, totalClassified: 160, totalLearned: 847, costUsd: 0.0008 },
  ],
  cost: {
    totalCostUsd: 0.003, totalCostJpy: 1,
    byModel: { 'claude-haiku-4-5': { calls: 96, cost_usd: 0.003 } },
    byFeature: { classification: 0.003 },
    dailyCosts: [{ day: '06-17', cost_usd: 0.0008, cost_jpy: 1 }],
  },
  coverage: {
    golden: { total: 50, covered: 48, rate: 0.96, misses: ['テスト店舗X'] },
    live: { regexRule: 960, vector: 480, llmFull: 384, failed: 32, correction: 64, regexRate: 0.30, llmRate: 0.12, failedRate: 0.01 },
  },
}

const MOCK_ANALYTICS_NO_SNAPSHOT = { ...MOCK_ANALYTICS_HEALTHY, healthSnapshots: [] }

const MOCK_ANALYTICS_NO_RAG = {
  ...MOCK_ANALYTICS_HEALTHY,
  ragStats: { totalLearned: 0, highConfidence: 0, hitCountDist: { once: 0, twice: 0, threeFour: 0, fiveNine: 0, tenPlus: 0 } },
  healthSnapshots: [],
}

// ── ヘルパー ──────────────────────────────────────────────────────

/**
 * /api/admin/analytics をモックしてページへ遷移する。
 * 未認証時は /login にリダイレクトされるため true を返す。
 * 呼び出し元で `if (redirected) { test.skip(); return }` を使う。
 */
async function gotoAnalytics(page: Page, body: object = MOCK_ANALYTICS_HEALTHY): Promise<boolean> {
  await page.route('/api/admin/analytics', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  )
  await page.goto('/admin/analytics')
  if (page.url().includes('/login')) return true
  await page.waitForSelector('text=RAG 学習状況', { timeout: 15_000 })
  return false
}

// ── テストスイート ────────────────────────────────────────────────

test.describe('AI 運用分析ページ', () => {

  // ── 基本ロード ───────────────────────────────────────────────────

  test('ページが正常にロードされ、主要セクションが表示される', async ({ page }) => {
    if (await gotoAnalytics(page)) { test.skip(); return }

    await expect(page.getByText('RAG 学習状況')).toBeVisible()
    await expect(page.getByText('システム健全度')).toBeVisible()
    await expect(page.getByText('分類の仕組み')).toBeVisible()
    await expect(page.getByText('長期トレンド')).toBeVisible()
  })

  // ── RAG学習状況 ──────────────────────────────────────────────────

  test.describe('RAG学習状況', () => {

    test('学習済み店舗数・高信頼店舗数・LLM削減率の3カードが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('学習済み店舗数')).toBeVisible()
      await expect(page.getByText('高信頼店舗数')).toBeVisible()
      await expect(page.getByText('LLM 削減率')).toBeVisible()
    })

    test('学習済み店舗数が847件として表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText(/847/)).toBeVisible()
    })

    test('高信頼店舗数が203件（hit_count >= 3）として表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText(/203/)).toBeVisible()
    })

    test('LLM削減率が88.0%として表示される（llm_full=384 / total=3200）', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      // (3200 - 384) / 3200 = 0.88 → 88.0%
      await expect(page.getByText(/88\.0%/)).toBeVisible()
    })

    test('hit_count分布グラフと「1回」「10回+」ラベルが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('hit_count 分布')).toBeVisible()
      await expect(page.getByText('1回')).toBeVisible()
      await expect(page.getByText('10回+')).toBeVisible()
    })

    test('RAGデータが0件のとき hit_count分布グラフが非表示になる（クラッシュしない）', async ({ page }) => {
      if (await gotoAnalytics(page, MOCK_ANALYTICS_NO_RAG)) { test.skip(); return }

      await expect(page.getByText('学習済み店舗数')).toBeVisible()
      // hitCountDist が全0 → some(d => d.count > 0) が false → グラフ非表示
      await expect(page.getByText('hit_count 分布')).not.toBeVisible()
    })

  })

  // ── 分類メソッド内訳 ─────────────────────────────────────────────

  test.describe('分類メソッド内訳', () => {

    test('7経路すべての日本語ラベルが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      for (const label of ['キャッシュ完全一致', 'キーワードルール', 'ベクター検索', 'ベクター再ランク', 'AI分類（Haiku）', '手動修正', '分類失敗']) {
        await expect(page.getByText(label).first()).toBeVisible()
      }
    })

    test('キャッシュ完全一致の割合が40.0%として表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      // exact_cache=1280 / sampleSize=3200 = 40.0%
      await expect(page.getByText('40.0%')).toBeVisible()
    })

    test('キャッシュ率70%以上のとき ✓ 良好バッジが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText(/✓.*キャッシュ率.*70\.0%/)).toBeVisible()
    })

  })

  // ── 長期トレンド（スナップショット） ────────────────────────────

  test.describe('長期トレンド — スナップショット', () => {

    test('スナップショットがない場合は「スナップショット蓄積中」バナーが表示される', async ({ page }) => {
      if (await gotoAnalytics(page, MOCK_ANALYTICS_NO_SNAPSHOT)) { test.skip(); return }

      await expect(page.getByText('スナップショット蓄積中')).toBeVisible()
      await expect(page.getByText('初回は翌朝 04:00 以降に表示されます')).toBeVisible()
    })

    test('スナップショットがある場合はキャッシュ率と学習店舗数の2グラフが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('キャッシュ率 長期推移')).toBeVisible()
      await expect(page.getByText('学習済み店舗数 長期推移')).toBeVisible()
    })

    test('スナップショットグラフが SVG で描画される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      const charts = page.locator('.recharts-surface')
      await expect(charts.first()).toBeVisible({ timeout: 8_000 })
    })

  })

  // ── 基準線 ──────────────────────────────────────────────────────

  test('グラフが描画されてもコンソールエラーが出ない（基準線含む）', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && (msg.text().includes('Uncaught') || msg.text().includes('Cannot read'))) {
        errors.push(msg.text())
      }
    })

    if (await gotoAnalytics(page)) { test.skip(); return }

    // スクロールして Recharts グラフと ReferenceLine を描画させる
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    expect(errors).toHaveLength(0)
  })

  // ── 分類ログ・精度 ───────────────────────────────────────────────

  test.describe('分類ログ・精度', () => {

    test('低confidence ミス（テスト店舗A）が表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('⚠ 信頼度が低い分類')).toBeVisible()
      await expect(page.getByText('テスト店舗A')).toBeVisible()
    })

    test('failedRows が空のとき「分類失敗（直近20件）」が非表示になる', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('✗ 分類失敗（直近20件）')).not.toBeVisible()
    })

    test('カテゴリ別分類精度スコアセクションが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('カテゴリ別 分類精度スコア')).toBeVisible()
      await expect(page.getByText('食費')).toBeVisible()
    })

    test('ゴールデンデータのカバー率が 96.0% と表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('96.0%')).toBeVisible()
    })

    test('未カバーの店舗名（テスト店舗X）が表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByText('テスト店舗X')).toBeVisible()
    })

  })

  // ── AI インサイト ────────────────────────────────────────────────

  test.describe('AI インサイト', () => {

    test('「このデータを分析する」ボタンが表示される', async ({ page }) => {
      if (await gotoAnalytics(page)) { test.skip(); return }

      await expect(page.getByRole('button', { name: /このデータを分析する|再分析/ })).toBeVisible()
    })

    test('クリック後にローディングになりインサイトが表示される', async ({ page }) => {
      await page.route('/api/admin/analytics/insight', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            insight: [
              '✓ キャッシュヒット率は70.0%と良好です。',
              '⚠ LLM呼び出し率が12%あります。regex_rule を拡充するとコスト削減できます。',
            ].join('\n'),
          }),
        })
      )

      if (await gotoAnalytics(page)) { test.skip(); return }

      const btn = page.getByRole('button', { name: /このデータを分析する|再分析/ })
      await btn.click()
      await expect(page.getByRole('button', { name: '分析中…' })).toBeVisible({ timeout: 3_000 })
      await expect(page.getByText(/キャッシュヒット率は70.0%と良好/)).toBeVisible({ timeout: 10_000 })
      await expect(page.getByText(/regex_rule を拡充/)).toBeVisible()
    })

  })

  // ── ツールチップ ─────────────────────────────────────────────────

  test('グラフのツールチップが白系の色で表示される', async ({ page }) => {
    if (await gotoAnalytics(page)) { test.skip(); return }

    const chart = page.locator('.recharts-surface').first()
    await chart.waitFor({ timeout: 8_000 })
    const box = await chart.boundingBox()
    if (!box) return

    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
    const tooltip = page.locator('.recharts-tooltip-wrapper')
    const visible = await tooltip.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!visible) return

    const color = await tooltip.locator('.recharts-tooltip-item').first()
      .evaluate((el) => window.getComputedStyle(el).color)
    expect(color).not.toBe('rgb(0, 0, 0)')
    const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (m) expect((+m[1] + +m[2] + +m[3]) / 3).toBeGreaterThan(150)
  })

  // ── コンソールエラーなし ─────────────────────────────────────────

  test('全セクション表示してもコンソールエラーが出ない', async ({ page }) => {
    const critical: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const t = msg.text()
      if (t.includes('Uncaught') || t.includes('Unhandled') || t.includes('Cannot read') || t.includes('ChunkLoadError')) {
        critical.push(t)
      }
    })

    if (await gotoAnalytics(page)) { test.skip(); return }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    await page.evaluate(() => window.scrollTo(0, 0))
    expect(critical, critical.join('\n')).toHaveLength(0)
  })

  test('スナップショットなし状態でもコンソールエラーが出ない', async ({ page }) => {
    const critical: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && (msg.text().includes('Uncaught') || msg.text().includes('Cannot read'))) {
        critical.push(msg.text())
      }
    })

    if (await gotoAnalytics(page, MOCK_ANALYTICS_NO_SNAPSHOT)) { test.skip(); return }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    expect(critical, critical.join('\n')).toHaveLength(0)
  })

  // ── API エラー処理 ───────────────────────────────────────────────

  test('API が 500 を返したときエラーメッセージを表示する', async ({ page }) => {
    await page.route('/api/admin/analytics', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    )
    await page.goto('/admin/analytics')
    if (page.url().includes('/login')) { test.skip(); return }

    await expect(page.getByText(/読み込みに失敗しました/)).toBeVisible({ timeout: 10_000 })
  })

  test('API が 403 を返したとき「管理者権限が必要です」を表示する', async ({ page }) => {
    await page.route('/api/admin/analytics', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: '管理者権限が必要です' }) })
    )
    await page.goto('/admin/analytics')
    if (page.url().includes('/login')) { test.skip(); return }

    await expect(page.getByText('管理者権限が必要です')).toBeVisible({ timeout: 10_000 })
  })

})
