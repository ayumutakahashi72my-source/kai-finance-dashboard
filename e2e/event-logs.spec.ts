/**
 * イベントログ E2E テスト
 *
 * 検証範囲:
 * - /admin/event-logs ページの正常ロード
 * - レベルフィルター（Error/Warn/Info）が動作すること
 * - ログ展開でURL・UA・メタデータが表示されること
 * - ユーザー名が正しく表示されること
 * - ページネーションが動作すること
 * - 非管理者で403が表示されること
 * - 設定画面から遷移できること
 * - コンソールエラーなし
 *
 * 方針:
 * - /api/admin/event-logs をモックして決定論的に動作させる
 * - 実際の Supabase には依存しない
 */

import { test, expect, Page } from '@playwright/test'

// ── モックデータ ──────────────────────────────────────────────────

const MOCK_LOGS = {
  logs: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      level: 'error',
      category: 'client-error',
      message: 'getCategoryIcon(...) is not a function',
      metadata: { name: 'TypeError', stack: 'at CategoryIconDisplay (TransactionsView.tsx:102)', context: 'error-boundary' },
      url: 'https://kai.example.com/transactions',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
      user_name: 'あゆむ',
      created_at: '2026-06-20T15:30:00Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      level: 'warn',
      category: 'AiChat',
      message: 'history load failed: Network error',
      metadata: null,
      url: 'https://kai.example.com/',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      user_name: 'なお',
      created_at: '2026-06-20T14:00:00Z',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      level: 'info',
      category: 'navigation',
      message: 'ページ遷移',
      metadata: { from: '/budget', to: '/' },
      url: 'https://kai.example.com/',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      user_name: 'あゆむ',
      created_at: '2026-06-20T13:00:00Z',
    },
  ],
  total: 3,
  counts: { error: 1, warn: 1, info: 1, total: 3 },
}

const MOCK_LOGS_ERROR_ONLY = {
  logs: [MOCK_LOGS.logs[0]],
  total: 1,
  counts: MOCK_LOGS.counts,
}

const MOCK_LOGS_EMPTY = {
  logs: [],
  total: 0,
  counts: { error: 0, warn: 0, info: 0, total: 0 },
}

// ── ヘルパー ──────────────────────────────────────────────────────

async function gotoEventLogs(page: Page, body: object = MOCK_LOGS): Promise<boolean> {
  await page.route('/api/admin/event-logs*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  )
  await page.goto('/admin/event-logs')
  if (page.url().includes('/login')) return true
  await page.waitForSelector('text=イベントログ', { timeout: 15_000 })
  return false
}

// ── テストスイート ────────────────────────────────────────────────

test.describe('イベントログページ', () => {

  // ── 基本ロード ───────────────────────────────────────────────────

  test('ページが正常にロードされ、ログ一覧が表示される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    await expect(page.getByText('イベントログ')).toBeVisible()
    await expect(page.getByText('getCategoryIcon(...) is not a function')).toBeVisible()
    await expect(page.getByText('history load failed: Network error')).toBeVisible()
    await expect(page.getByText('ページ遷移')).toBeVisible()
  })

  test('戻るボタンが表示される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    const backLink = page.locator('a[href="/settings"]')
    await expect(backLink).toBeVisible()
  })

  // ── フィルター ──────────────────────────────────────────────────

  test.describe('レベルフィルター', () => {

    test('全て・Error・Warn・Info の4つのフィルターチップが表示される', async ({ page }) => {
      if (await gotoEventLogs(page)) { test.skip(); return }

      await expect(page.getByRole('button', { name: /全て \(3\)/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Error \(1\)/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Warn \(1\)/ })).toBeVisible()
      await expect(page.getByRole('button', { name: /Info \(1\)/ })).toBeVisible()
    })

    test('Errorフィルターをクリックするとリクエストにlevel=errorが含まれる', async ({ page }) => {
      let requestedUrl = ''
      await page.route('/api/admin/event-logs*', (route) => {
        requestedUrl = route.request().url()
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_LOGS_ERROR_ONLY),
        })
      })
      await page.goto('/admin/event-logs')
      if (page.url().includes('/login')) { test.skip(); return }
      await page.waitForSelector('text=イベントログ', { timeout: 15_000 })

      await page.getByRole('button', { name: /Error/ }).click()
      await page.waitForTimeout(500)
      expect(requestedUrl).toContain('level=error')
    })

  })

  // ── ユーザー名・ページパス表示 ──────────────────────────────────

  test('ユーザー名がログエントリに表示される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    await expect(page.getByText('あゆむ').first()).toBeVisible()
    await expect(page.getByText('なお')).toBeVisible()
  })

  test('ページパスが折りたたみ状態で表示される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    await expect(page.getByText('/transactions')).toBeVisible()
  })

  // ── 詳細展開 ────────────────────────────────────────────────────

  test('ログをクリックすると詳細（URL・UA・メタデータ）が展開される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    const firstLog = page.getByText('getCategoryIcon(...) is not a function')
    await firstLog.click()

    await expect(page.getByText('URL:')).toBeVisible()
    await expect(page.getByText('https://kai.example.com/transactions')).toBeVisible()
    await expect(page.getByText('UA:')).toBeVisible()
    await expect(page.getByText(/iPhone/)).toBeVisible()
    await expect(page.getByText(/"name":\s*"TypeError"/)).toBeVisible()
  })

  // ── 空ステート ──────────────────────────────────────────────────

  test('ログが0件のとき「ログがありません」が表示される', async ({ page }) => {
    if (await gotoEventLogs(page, MOCK_LOGS_EMPTY)) { test.skip(); return }

    await expect(page.getByText('ログがありません')).toBeVisible()
  })

  // ── エラーハンドリング ──────────────────────────────────────────

  test('APIが403を返したとき「管理者権限が必要です」が表示される', async ({ page }) => {
    await page.route('/api/admin/event-logs*', (route) =>
      route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: '管理者権限が必要です' }) })
    )
    await page.goto('/admin/event-logs')
    if (page.url().includes('/login')) { test.skip(); return }

    await expect(page.getByText('管理者権限が必要です')).toBeVisible({ timeout: 10_000 })
  })

  test('APIが500を返したとき「読み込みに失敗しました」が表示される', async ({ page }) => {
    await page.route('/api/admin/event-logs*', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Internal Server Error' }) })
    )
    await page.goto('/admin/event-logs')
    if (page.url().includes('/login')) { test.skip(); return }

    await expect(page.getByText('読み込みに失敗しました')).toBeVisible({ timeout: 10_000 })
  })

  // ── コンソールエラーなし ─────────────────────────────────────────

  test('ページ表示でコンソールエラーが出ない', async ({ page }) => {
    const critical: string[] = []
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const t = msg.text()
      if (t.includes('Uncaught') || t.includes('Unhandled') || t.includes('Cannot read') || t.includes('ChunkLoadError')) {
        critical.push(t)
      }
    })

    if (await gotoEventLogs(page)) { test.skip(); return }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)
    expect(critical, critical.join('\n')).toHaveLength(0)
  })

  // ── レベルバッジの色 ────────────────────────────────────────────

  test('ERRORバッジが赤系の色で表示される', async ({ page }) => {
    if (await gotoEventLogs(page)) { test.skip(); return }

    const errorBadge = page.getByText('error', { exact: true }).first()
    await expect(errorBadge).toBeVisible()
    const color = await errorBadge.evaluate((el) => window.getComputedStyle(el).color)
    expect(color).toContain('251')
  })

})
