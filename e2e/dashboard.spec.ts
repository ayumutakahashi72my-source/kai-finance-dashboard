/**
 * ダッシュボード E2E テスト
 *
 * 検証対象:
 * 1. 未認証時のリダイレクト
 * 2. 3タブの切り替えがエラーなく動作すること
 * 3. NowTab 主要コンポーネントの表示
 * 4. AiSummaryCard のローディング・表示・エラー・再生成
 * 5. GoalSection のゴールなし状態（GoalBanner）
 * 6. JS コンソールエラーが出ないこと
 */
import { test, expect, Page } from '@playwright/test'

// ── モックデータ ──────────────────────────────────────────────────

const MOCK_GOALS_EMPTY = { goals: [] }
const MOCK_GOALS_WITH_GOAL = {
  goals: [
    {
      id: 'goal-1',
      name: '緊急用貯金',
      target_amount: 500000,
      deadline: '2026-12-31',
      monthly_savings_target: 30000,
      monthly_spending_limit: null,
      risk_level: 'safe',
      advice: null,
      suggested_months_alternative: null,
      plan_steps: null,
    },
  ],
}
const MOCK_SUMMARY_NONE = { data: null }
const MOCK_SUMMARY_EXISTS = {
  data: {
    year: 2026,
    month: 5,
    content: '## 今月のまとめ\n今月は全体的に支出が抑えられており、貯蓄率が改善されています。',
    created_at: new Date().toISOString(),
  },
}

// ── ヘルパー ──────────────────────────────────────────────────────

/** クライアントサイド API をすべてモックしてからダッシュボードへ遷移 */
async function setupAndGoto(page: Page, opts: {
  goals?: object
  summary?: object
  summaryPostStatus?: number
} = {}) {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.route('/api/goals', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.goals ?? MOCK_GOALS_EMPTY) })
  )
  await page.route('/api/ai/summary', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.summary ?? MOCK_SUMMARY_NONE) })
    } else {
      await route.fulfill({
        status: opts.summaryPostStatus ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(opts.summaryPostStatus === 500
          ? { error: '生成に失敗しました' }
          : MOCK_SUMMARY_EXISTS
        ),
      })
    }
  })
  // ScoreCard 用（存在しない場合はスキップ）
  await page.route('/api/scores*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ score: null }) })
  )

  await page.goto('/')
  return { consoleErrors }
}

/** タブボタンを名前で取得してクリック */
async function clickTab(page: Page, name: string) {
  await page.getByRole('button', { name }).click()
}

// ── テスト ────────────────────────────────────────────────────────

test.describe('ダッシュボード', () => {

  test('未認証の場合は /login にリダイレクトされる', async ({ page }) => {
    // storageState を使わずアクセス（このテストだけ強制的に認証なしで実行）
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('ページが正常にロードされ、3タブが表示される', async ({ page }) => {
    await setupAndGoto(page)

    // 認証なしなら login にリダイレクト → テストをスキップ
    if (page.url().includes('/login')) {
      test.skip()
      return
    }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    await expect(page.getByRole('button', { name: 'NOW' })).toBeVisible()
    await expect(page.getByRole('button', { name: '分析' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AI戦略' })).toBeVisible()
  })

  test('NOW → 分析 → AI戦略 タブ切り替えがエラーなく動作する', async ({ page }) => {
    const { consoleErrors } = await setupAndGoto(page)

    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // NOW → 分析
    await clickTab(page, '分析')
    await page.waitForTimeout(600) // dynamic import 待ち
    // 収支トレンドチャートまたはデータなしが表示される
    await expect(
      page.getByText(/収支トレンド|データなし/)
    ).toBeVisible({ timeout: 8_000 })

    // 分析 → AI戦略
    await clickTab(page, 'AI戦略')
    await expect(page.getByText('今日のひとこと')).toBeVisible({ timeout: 5_000 })

    // AI戦略 → NOW
    await clickTab(page, 'NOW')
    await page.waitForTimeout(300)

    // タブ切り替え中に React クラッシュが起きていないことを確認
    const reactErrors = consoleErrors.filter((e) =>
      e.includes('Uncaught') || e.includes('Unhandled') || e.includes('Cannot read')
    )
    expect(reactErrors, `コンソールエラー: ${reactErrors.join('\n')}`).toHaveLength(0)
  })

  test('NowTab — カテゴリリングまたは「カテゴリ別支出」が表示される', async ({ page }) => {
    await setupAndGoto(page)
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // モバイルレイアウト（lg:hidden）またはデスクトップ（lg:flex）どちらかで表示
    await expect(
      page.getByText('カテゴリ別支出').first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('NowTab — GoalSection がゴールなしのとき GoalBanner を表示する', async ({ page }) => {
    await setupAndGoto(page, { goals: MOCK_GOALS_EMPTY })
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // GoalBanner: 「目標を設定する」リンクなどが表示される
    await expect(
      page.getByText(/目標を設定|目標が設定されていません|はじめる/)
    ).toBeVisible({ timeout: 8_000 })
  })

  test('NowTab — GoalSection がゴールありのとき GoalProgressCard を表示する', async ({ page }) => {
    await setupAndGoto(page, { goals: MOCK_GOALS_WITH_GOAL })
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    await expect(page.getByText('緊急用貯金')).toBeVisible({ timeout: 8_000 })
  })

  test('AI戦略 — AiSummaryCard がサマリーなしのとき「今月分を生成」ボタンを表示する', async ({ page }) => {
    await setupAndGoto(page, { summary: MOCK_SUMMARY_NONE })
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })
    await clickTab(page, 'AI戦略')

    await expect(page.getByRole('button', { name: '今月分を生成' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('今月のサマリーはまだ生成されていません')).toBeVisible()
  })

  test('AI戦略 — AiSummaryCard がサマリーありのとき本文と「再生成」ボタンを表示する', async ({ page }) => {
    await setupAndGoto(page, { summary: MOCK_SUMMARY_EXISTS })
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })
    await clickTab(page, 'AI戦略')

    // extractFirstParagraph で本文の冒頭が表示される
    await expect(page.getByText(/今月は全体的に支出が抑えられており/)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: '再生成' })).toBeVisible()
    await expect(page.getByText('全文を見る')).toBeVisible()
  })

  test('AI戦略 — 再生成ボタンをクリックすると「生成中…」になる', async ({ page }) => {
    // POST がすぐ返らないよう遅延させる
    await page.route('/api/ai/summary', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUMMARY_EXISTS) })
      } else {
        await new Promise((r) => setTimeout(r, 3000)) // 3秒遅延
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUMMARY_EXISTS) })
      }
    })
    await page.route('/api/goals', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GOALS_EMPTY) })
    )

    await page.goto('/')
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })
    await clickTab(page, 'AI戦略')
    await page.waitForSelector('button:has-text("再生成")', { timeout: 8_000 })

    await page.getByRole('button', { name: '再生成' }).click()
    await expect(page.getByRole('button', { name: '生成中…' })).toBeVisible({ timeout: 3_000 })
  })

  test('AI戦略 — サマリー生成が失敗したときエラーメッセージを表示する', async ({ page }) => {
    await setupAndGoto(page, { summary: MOCK_SUMMARY_NONE, summaryPostStatus: 500 })
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })
    await clickTab(page, 'AI戦略')
    await page.waitForSelector('button:has-text("今月分を生成")', { timeout: 8_000 })

    await page.getByRole('button', { name: '今月分を生成' }).click()

    await expect(page.getByText(/生成失敗|生成に失敗/)).toBeVisible({ timeout: 8_000 })
  })

  test('コンソールに React の未捕捉エラーが出ないこと（全タブ巡回）', async ({ page }) => {
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (
          text.includes('Uncaught') ||
          text.includes('Unhandled Rejection') ||
          text.includes('Cannot read properties') ||
          text.includes('is not a function') ||
          text.includes('ChunkLoadError')
        ) {
          criticalErrors.push(text)
        }
      }
    })

    await page.route('/api/goals', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_GOALS_EMPTY) })
    )
    await page.route('/api/ai/summary', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUMMARY_EXISTS) })
    )
    await page.route('/api/scores*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ score: null }) })
    )

    await page.goto('/')
    if (page.url().includes('/login')) { test.skip(); return }

    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // 全タブを順に開く
    for (const tab of ['NOW', '分析', 'AI戦略']) {
      await clickTab(page, tab)
      await page.waitForTimeout(800)
    }

    expect(
      criticalErrors,
      `未捕捉エラーが検出されました:\n${criticalErrors.join('\n')}`
    ).toHaveLength(0)
  })

})
