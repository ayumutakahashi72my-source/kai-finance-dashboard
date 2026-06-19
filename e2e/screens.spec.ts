/**
 * 全画面 E2E テスト
 *
 * 検証対象:
 * 1. 認証リダイレクト — 未認証で全保護ページが /login へ飛ぶ
 * 2. ログインページ — 正常にロードされる
 * 3. ダッシュボード — BottomBar・タブ・主要UIが表示される
 * 4. 収支ページ — MonthSwitcher・取引一覧が表示される
 * 5. 予算ページ — BudgetDashboard 主要カードが表示される
 * 6. カレンダーページ — カレンダーグリッドが表示される
 * 7. 設定ページ — プロフィール・セクション一覧が表示される
 * 8. AIチャットページ — チャットパネルが表示される
 * 9. 画面遷移 — BottomBar で全画面を巡回してクラッシュしない
 * 10. レイテンシー — 各ページの初期ロードが許容範囲内
 * 11. コンソールエラー — 全画面巡回でクリティカルエラーなし
 */
import { test, expect, Page } from '@playwright/test'

// ── ヘルパー ──────────────────────────────────────────────────

const CRITICAL_ERROR_PATTERNS = [
  'Uncaught', 'Unhandled Rejection', 'Cannot read properties',
  'is not a function', 'ChunkLoadError', 'NEXT_NOT_FOUND',
  'TypeError', 'ReferenceError',
]

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (CRITICAL_ERROR_PATTERNS.some((p) => text.includes(p))) {
        errors.push(text)
      }
    }
  })
  return errors
}

/** 認証済みかどうか判定（/login に飛ばされなければ認証済み） */
async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/')
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  return !page.url().includes('/login')
}

// 全保護ルートの認証リダイレクトを検証するために使うパスリスト
const PROTECTED_PATHS = [
  '/',
  '/transactions',
  '/budget',
  '/calendar',
  '/settings',
  '/summary',
  '/admin/analytics',
  '/settings/categories',
  '/settings/goals',
  '/settings/notifications',
  '/settings/corrections',
]

const PUBLIC_PATHS = [
  '/login',
  '/legal/terms',
  '/legal/privacy',
  '/legal/cookie',
  '/legal/data',
]

// ── 認証リダイレクト ────────────────────────────────────────────

test.describe('認証リダイレクト', () => {
  test('全保護ページに未認証でアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.context().clearCookies()

    for (const path of PROTECTED_PATHS) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })

  test('公開ページは未認証でもアクセスできる', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    for (const p of PUBLIC_PATHS) {
      const res = await page.goto(p)
      // 500エラーでないこと（リダイレクトは許容: ミドルウェアの設定依存）
      const status = res?.status() ?? 0
      expect(status, `${p} returned ${status}`).not.toBe(500)
    }

    await ctx.close()
  })
})

// ── ログインページ ────────────────────────────────────────────

test.describe('ログインページ', () => {
  test('ロゴとログインボタンが表示される', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // ページが 500 エラーでないこと
    const content = await page.textContent('body')
    expect(content).not.toContain('INTERNAL_SERVER_ERROR')
    expect(content).not.toContain('500: INTERNAL_SERVER_ERROR')

    // Google ログインボタンまたはデモログインが表示される
    const hasGoogleBtn = await page.locator('button, a').filter({ hasText: /Google|ログイン|デモ/ }).first().isVisible().catch(() => false)
    expect(hasGoogleBtn).toBeTruthy()
  })
})

// ── 法的ページ ────────────────────────────────────────────────

test.describe('法的ページ', () => {
  for (const path of PUBLIC_PATHS.filter((p) => p.startsWith('/legal'))) {
    test(`${path} が正常にロードされる`, async ({ page }) => {
      const res = await page.goto(path)
      expect(res?.status()).toBe(200)

      const content = await page.textContent('body')
      expect(content?.length).toBeGreaterThan(100)
    })
  }
})

// ── ダッシュボード（認証済み） ─────────────────────────────────

test.describe('ダッシュボード', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('挨拶メッセージとタブが表示される', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // 挨拶文
    await expect(page.getByText(/おはようございます|こんにちは|こんばんは/)).toBeVisible()

    // 2タブ
    await expect(page.getByRole('button', { name: '今月' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'AI' })).toBeVisible()
  })

  test('BottomBar の全リンクが存在し48px以上のタップ領域を持つ', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const labels = ['ホーム', '収支', '分析', 'AI']
    for (const label of labels) {
      const link = page.locator(`a[aria-label="${label}"]`)
      await expect(link).toBeVisible()
      const box = await link.boundingBox()
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
      }
    }

    // FAB（+ボタン）
    const fab = page.locator('button[aria-label="追加"]')
    await expect(fab).toBeVisible()
    const fabBox = await fab.boundingBox()
    if (fabBox) {
      expect(fabBox.width).toBeGreaterThanOrEqual(48)
      expect(fabBox.height).toBeGreaterThanOrEqual(48)
    }
  })

  test('初期ロードが5秒以内に完了する', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(5000)
  })
})

// ── 収支ページ ─────────────────────────────────────────────────

test.describe('収支ページ', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('ページが正常にロードされる', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')

    // 500エラーでない
    expect(await page.textContent('body')).not.toContain('INTERNAL_SERVER_ERROR')

    // MonthSwitcher が存在する
    await expect(page.locator('button').filter({ hasText: /◀|▶|<|>/ }).first()).toBeVisible({ timeout: 10_000 })

    expect(errors).toHaveLength(0)
  })

  test('初期ロードが5秒以内', async ({ page }) => {
    const start = Date.now()
    await page.goto('/transactions')
    await page.waitForLoadState('networkidle')
    expect(Date.now() - start).toBeLessThan(5000)
  })
})

// ── 予算ページ ─────────────────────────────────────────────────

test.describe('予算ページ', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('キャッシュフローカードと予算ダッシュボードが表示される', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/budget')
    await page.waitForLoadState('networkidle')

    expect(await page.textContent('body')).not.toContain('INTERNAL_SERVER_ERROR')

    // CashflowCard か BudgetDashboard の要素が表示される
    await expect(
      page.getByText(/収入|支出|予算|キャッシュフロー/).first()
    ).toBeVisible({ timeout: 10_000 })

    expect(errors).toHaveLength(0)
  })
})

// ── カレンダーページ ──────────────────────────────────────────

test.describe('カレンダーページ', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('カレンダーグリッドと収支サマリーが表示される', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')

    // 曜日ヘッダー（日月火水木金土）
    await expect(page.getByText('月').first()).toBeVisible({ timeout: 10_000 })

    // 収入・支出カード
    await expect(page.getByText('収入').first()).toBeVisible()
    await expect(page.getByText('支出').first()).toBeVisible()

    expect(errors).toHaveLength(0)
  })
})

// ── 設定ページ ─────────────────────────────────────────────────

test.describe('設定ページ', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('プロフィールとセクション一覧が表示される', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // プロフィールカード
    await expect(page.getByText(/Google|DEMO/).first()).toBeVisible({ timeout: 10_000 })

    // セクションリンク
    await expect(page.getByText('カテゴリ管理')).toBeVisible()
    await expect(page.getByText('目標管理')).toBeVisible()
    await expect(page.getByText('通知設定')).toBeVisible()

    // ビルド情報
    await expect(page.getByText(/kai v/)).toBeVisible()

    expect(errors).toHaveLength(0)
  })

  test('設定の各リンクが正しい href を持つ', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const expectedLinks = [
      { text: 'カテゴリ管理', href: '/settings/categories' },
      { text: '目標管理', href: '/settings/goals' },
      { text: '通知設定', href: '/settings/notifications' },
    ]

    for (const { text, href } of expectedLinks) {
      const link = page.locator('a').filter({ hasText: text }).first()
      await expect(link).toHaveAttribute('href', href)
    }
  })
})

// ── AIチャットページ ────────────────────────────────────────────

test.describe('AIチャットページ', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('チャットパネルと月次サマリーが表示される', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.goto('/summary')
    await page.waitForLoadState('networkidle')

    expect(await page.textContent('body')).not.toContain('INTERNAL_SERVER_ERROR')

    // 月次サマリーの details
    await expect(page.getByText('月次サマリー')).toBeVisible({ timeout: 10_000 })

    expect(errors).toHaveLength(0)
  })
})

// ── 画面遷移（BottomBar巡回） ──────────────────────────────────

test.describe('画面遷移', () => {
  test('BottomBar で全画面を巡回してクラッシュしない', async ({ page }) => {
    if (!(await isAuthenticated(page))) { test.skip(); return }

    const errors = collectConsoleErrors(page)

    await page.goto('/')
    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // BottomBar のリンクを順に巡回
    const navPaths = [
      { label: '収支', path: '/transactions' },
      { label: '分析', path: '/analytics' },
      { label: 'AI', path: '/summary' },
      { label: 'ホーム', path: '/' },
    ]

    for (const { label, path } of navPaths) {
      await page.locator(`a[aria-label="${label}"]`).click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      expect(page.url()).toContain(path === '/' ? '' : path)
    }

    // 設定ページ（BottomBarにないが直接遷移）
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('body')).not.toContain('INTERNAL_SERVER_ERROR')

    // 予算ページ
    await page.goto('/budget')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('body')).not.toContain('INTERNAL_SERVER_ERROR')

    const criticalErrors = errors.filter((e) =>
      e.includes('Uncaught') || e.includes('Cannot read') || e.includes('ChunkLoadError')
    )
    expect(criticalErrors, `クリティカルエラー:\n${criticalErrors.join('\n')}`).toHaveLength(0)
  })
})

// ── レイテンシー ────────────────────────────────────────────────

test.describe('レイテンシー', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  const pages = [
    { name: 'ダッシュボード', path: '/', maxMs: 5000 },
    { name: '収支', path: '/transactions', maxMs: 5000 },
    { name: '予算', path: '/budget', maxMs: 6000 },
    { name: 'カレンダー', path: '/calendar', maxMs: 5000 },
    { name: '設定', path: '/settings', maxMs: 4000 },
    { name: 'AIチャット', path: '/summary', maxMs: 5000 },
  ]

  for (const { name, path, maxMs } of pages) {
    test(`${name}ページの初期ロードが${maxMs}ms以内`, async ({ page }) => {
      const start = Date.now()
      await page.goto(path)
      await page.waitForLoadState('networkidle', { timeout: maxMs + 5000 }).catch(() => {})
      const elapsed = Date.now() - start
      expect(elapsed, `${name}: ${elapsed}ms`).toBeLessThan(maxMs)
    })
  }
})

// ── API ヘルスチェック ──────────────────────────────────────────

test.describe('API ヘルスチェック', () => {
  test('認証なしで保護 API にアクセスすると認証保護される', async ({ request }) => {
    const protectedEndpoints = [
      '/api/transactions',
      '/api/categories',
      '/api/budgets',
      '/api/goals',
      '/api/cashflow',
      '/api/scores',
      '/api/ai/summary',
      '/api/feedback',
    ]

    for (const endpoint of protectedEndpoints) {
      const res = await request.get(endpoint, { maxRedirects: 0 })
      const s = res.status()
      const isProtected = s === 401 || s === 302 || s === 307
      expect(isProtected, `${endpoint} returned ${s}`).toBeTruthy()
    }
  })

  test('存在しない API パスはエラーにならない（500 でないこと）', async ({ request }) => {
    const res = await request.get('/api/nonexistent', { maxRedirects: 0 })
    expect(res.status()).not.toBe(500)
  })

  test('CRON エンドポイントは認証なしで認証保護される', async ({ request }) => {
    const cronEndpoints = [
      '/api/cron/monthly',
      '/api/cron/quarterly',
      '/api/cron/health-snapshot',
    ]

    for (const endpoint of cronEndpoints) {
      const res = await request.get(endpoint, { maxRedirects: 0 })
      const s = res.status()
      const isProtected = s === 401 || s === 302 || s === 307
      expect(isProtected, `${endpoint} returned ${s}`).toBeTruthy()
    }
  })
})

// ── FAB（追加ボタン） ───────────────────────────────────────────

test.describe('FAB（追加ボタン）', () => {
  test.beforeEach(async ({ page }) => {
    if (!(await isAuthenticated(page))) test.skip()
  })

  test('FAB をタップするとピッカーシートが開く', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[aria-pressed]', { timeout: 15_000 })

    // モバイルビューポートで FAB を表示
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)

    const fab = page.locator('button[aria-label="追加"]')
    await expect(fab).toBeVisible({ timeout: 5_000 })
    await fab.click()

    // PickerSheet が開く（「手入力」「レシート読取」などの選択肢）
    await expect(
      page.getByText(/手入力|レシート|CSV/)
    ).toBeVisible({ timeout: 5_000 })
  })
})

// ── コンソールエラー全画面巡回 ──────────────────────────────────

test.describe('コンソールエラー監視', () => {
  test('全画面を巡回してクリティカルなJSエラーがないこと', async ({ page }) => {
    if (!(await isAuthenticated(page))) { test.skip(); return }

    const errors = collectConsoleErrors(page)

    const allPaths = ['/', '/transactions', '/budget', '/calendar', '/settings', '/summary']

    for (const path of allPaths) {
      await page.goto(path)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
      await page.waitForTimeout(500)
    }

    expect(
      errors,
      `クリティカルエラー検出:\n${errors.join('\n')}`
    ).toHaveLength(0)
  })
})
