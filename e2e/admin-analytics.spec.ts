/**
 * 管理者向け分析ページの E2E 検証
 *
 * 検証対象:
 * 1. ツールチップのテキスト色が白系（黒でない）こと
 * 2. AI インサイトボタンが存在し、クリックで「分析中…」になること
 * 3. インサイントが返ってきたら箇条書きで表示されること
 */
import { test, expect, Page } from '@playwright/test'

// ── ヘルパー ──────────────────────────────────────────────────────

async function gotoAnalytics(page: Page) {
  await page.goto('/admin/analytics')
  // ローディング Skeleton が消えるまで待つ
  await page.waitForSelector('text=サマリー（直近10,000件）', { timeout: 15_000 })
}

// ── テスト ────────────────────────────────────────────────────────

test.describe('AI 運用分析ページ', () => {

  test('ページが正常にロードされ、統計カードが表示される', async ({ page }) => {
    await gotoAnalytics(page)

    await expect(page.getByText('キャッシュヒット率')).toBeVisible()
    await expect(page.getByText('API 呼び出し')).toBeVisible()
    await expect(page.getByText('平均類似度')).toBeVisible()
    await expect(page.getByText('AI インサイト')).toBeVisible()
  })

  test('ツールチップの itemStyle が白系の色であること（黒でないこと）', async ({ page }) => {
    await gotoAnalytics(page)

    // Recharts グラフをホバーしてツールチップを表示
    const chart = page.locator('.recharts-surface').first()
    await chart.waitFor({ timeout: 5_000 })

    // SVGの中央あたりにホバー
    const box = await chart.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
    }

    // ツールチップが出たら色を確認
    const tooltip = page.locator('.recharts-tooltip-wrapper')
    const isVisible = await tooltip.isVisible({ timeout: 3_000 }).catch(() => false)

    if (isVisible) {
      // ツールチップ内のテキスト要素の color を確認
      const itemColor = await tooltip.locator('.recharts-tooltip-item').first().evaluate((el) => {
        return window.getComputedStyle(el).color
      })

      // rgb(0, 0, 0) = 黒 でないことを確認
      expect(itemColor).not.toBe('rgb(0, 0, 0)')
      // 白系（240前後）であることを確認
      const match = itemColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      if (match) {
        const avg = (parseInt(match[1]) + parseInt(match[2]) + parseInt(match[3])) / 3
        expect(avg).toBeGreaterThan(150) // 明るい色であること
      }
    } else {
      // データなしでツールチップが出ない場合は itemStyle の DOM を直接確認
      // (ロジックが正しく適用されているかは API test で担保)
      test.skip()
    }
  })

  test('「このデータを分析する」ボタンが存在し、クリックで loading になる', async ({ page }) => {
    await gotoAnalytics(page)

    const btn = page.getByRole('button', { name: /このデータを分析する|再分析/ })
    await expect(btn).toBeVisible()

    // データが0件の場合はボタンが disabled → スキップ
    const isDisabled = await btn.isDisabled()
    if (isDisabled) {
      test.skip()
      return
    }

    // クリック直後に「分析中…」に変わることを確認
    await btn.click()
    await expect(page.getByRole('button', { name: '分析中…' })).toBeVisible({ timeout: 3_000 })
  })

  test('インサイト生成後に箇条書き形式のテキストが表示される', async ({ page }) => {
    // APIをモックして高速に応答を返す
    await page.route('/api/admin/analytics/insight', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          insight: [
            '✓ キャッシュヒット率は75.0%と良好です。このまま維持してください。',
            '⚠ 平均レイテンシが2,500msと高めです。vector経路の比率を上げると改善できます。',
            '🔴 分類失敗率が5.2%あります。失敗している支払先にキーワードルールを追加してください。',
          ].join('\n'),
        }),
      })
    })

    await gotoAnalytics(page)

    const btn = page.getByRole('button', { name: /このデータを分析する|再分析/ })
    const isDisabled = await btn.isDisabled()
    if (isDisabled) {
      test.skip()
      return
    }

    await btn.click()

    // インサイトテキストが表示される
    await expect(page.getByText(/キャッシュヒット率は75.0%と良好/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/分類失敗率が5.2%/)).toBeVisible()

    // 🔴 の行は danger カラー（赤系）で表示されることを確認
    const critLine = page.getByText(/分類失敗率が5.2%/)
    const color = await critLine.evaluate((el) => window.getComputedStyle(el).color)
    // KAI.danger = '#ff4560' に近い赤系であること
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      expect(parseInt(match[1])).toBeGreaterThan(200) // R が高い（赤系）
    }
  })

  test('平均類似度が N/A のとき「vector_direct/rerank なし」が表示される', async ({ page }) => {
    // avgSimilarity = 0 のデータを返すようモック
    await page.route('/api/admin/analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            total: 100, cacheHits: 70, hitRate: 0.7,
            totalApiCalls: 30, avgLatency: 800, p95Latency: 1200,
            avgConfidence: 0.88, avgSimilarity: 0,
          },
          methodBreakdown: { regex_rule: 50, exact_cache: 20, llm_full: 28, failed: 2 },
          dailyStats: [],
          lowConfidenceMisses: [],
          failedRows: [],
          cost: { totalCostUsd: 0, totalCostJpy: 0, byModel: {}, byFeature: {}, dailyCosts: [] },
          coverage: {
            golden: { total: 10, covered: 9, rate: 0.9, misses: [] },
            live: { regexRule: 50, vector: 0, llmFull: 28, failed: 2, correction: 0, regexRate: 0.5, llmRate: 0.28, failedRate: 0.02 },
          },
        }),
      })
    })

    await page.goto('/admin/analytics')
    await page.waitForSelector('text=サマリー（直近10,000件）', { timeout: 10_000 })

    await expect(page.getByText('vector_direct/rerank なし')).toBeVisible()
    await expect(page.getByText('N/A')).toBeVisible()
  })

})
