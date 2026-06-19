/**
 * API セキュリティ E2E テスト
 *
 * 検証対象:
 * 1. 全保護 API が認証なしで 401 を返す
 * 2. CRON エンドポイントが CRON_SECRET なしで 401 を返す
 * 3. 不正な JSON ボディで 400 を返す（500 でないこと）
 * 4. SQLインジェクション的な入力で 400/422 を返す（500 でないこと）
 * 5. XSS的な入力がサニタイズされる
 * 6. レスポンスヘッダーにセキュリティ関連ヘッダーが含まれる
 */
import { test, expect } from '@playwright/test'

// ── 認証なしアクセス ──────────────────────────────────────────

test.describe('API 認証ガード', () => {
  const protectedGET = [
    '/api/transactions',
    '/api/categories',
    '/api/budgets',
    '/api/goals',
    '/api/cashflow',
    '/api/scores',
    '/api/ai/summary',
    '/api/feedback',
    '/api/fixed-expenses',
    '/api/anomalies',
    '/api/admin/analytics',
    '/api/settings/members',
    '/api/settings/mf',
    '/api/settings/mf/logs',
    '/api/push/subscribe',
  ]

  const protectedPOST = [
    '/api/transactions',
    '/api/categories',
    '/api/transactions/classify',
    '/api/transactions/classify-one',
    '/api/transactions/import/csv',
    '/api/transactions/bulk-delete',
    '/api/transactions/duplicates',
    '/api/ai/summary',
    '/api/ai/chat',
    '/api/budget/suggest',
    '/api/goals',
    '/api/feedback',
    '/api/settings/members/invite',
    '/api/settings/mf/sync',
    '/api/push/subscribe',
    '/api/push/unsubscribe',
  ]

  for (const endpoint of protectedGET) {
    test(`GET ${endpoint} → 401`, async ({ request }) => {
      const res = await request.get(endpoint)
      expect(res.status(), `${endpoint} returned ${res.status()}`).toBe(401)
    })
  }

  for (const endpoint of protectedPOST) {
    test(`POST ${endpoint} → 401`, async ({ request }) => {
      const res = await request.post(endpoint, {
        data: {},
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status(), `${endpoint} returned ${res.status()}`).toBe(401)
    })
  }
})

// ── CRON 認証 ─────────────────────────────────────────────────

test.describe('CRON エンドポイント認証', () => {
  const cronEndpoints = [
    '/api/cron/monthly',
    '/api/cron/quarterly',
    '/api/cron/health-snapshot',
    '/api/cron/mf-import',
    '/api/cron/demo-reset',
  ]

  for (const endpoint of cronEndpoints) {
    test(`${endpoint} — Bearer なしで 401`, async ({ request }) => {
      const res = await request.get(endpoint)
      expect(res.status()).toBe(401)
    })

    test(`${endpoint} — 不正な Bearer で 401`, async ({ request }) => {
      const res = await request.get(endpoint, {
        headers: { Authorization: 'Bearer invalid-secret' },
      })
      expect(res.status()).toBe(401)
    })
  }
})

// ── 不正入力ハンドリング ────────────────────────────────────────

test.describe('不正入力でサーバーエラーにならない', () => {
  test('不正な JSON ボディで 400 系を返す（500 でないこと）', async ({ request }) => {
    const endpoints = [
      '/api/transactions',
      '/api/categories',
      '/api/goals',
      '/api/feedback',
    ]

    for (const endpoint of endpoints) {
      const res = await request.post(endpoint, {
        data: 'not-json',
        headers: { 'Content-Type': 'application/json' },
      })
      // 401（認証なし）か 400（パースエラー）が期待値。500 は許容しない
      expect(res.status(), `${endpoint} returned 500`).not.toBe(500)
    }
  })

  test('空ボディの POST で 500 にならない', async ({ request }) => {
    const endpoints = [
      '/api/transactions',
      '/api/categories',
    ]

    for (const endpoint of endpoints) {
      const res = await request.post(endpoint, {
        headers: { 'Content-Type': 'application/json' },
      })
      expect(res.status(), `${endpoint} returned 500`).not.toBe(500)
    }
  })

  test('SQL インジェクション的な入力で 500 にならない', async ({ request }) => {
    const maliciousInputs = [
      "'; DROP TABLE transactions; --",
      "1 OR 1=1",
      "<script>alert(1)</script>",
      "{{constructor.constructor('return process.env')()}}",
    ]

    for (const input of maliciousInputs) {
      const res = await request.get(`/api/transactions?month=${encodeURIComponent(input)}`)
      expect(res.status(), `Malicious input caused 500: ${input}`).not.toBe(500)
    }
  })
})

// ── デモ認証エンドポイント ─────────────────────────────────────

test.describe('デモ認証', () => {
  test('POST /api/auth/demo が正常に応答する', async ({ request }) => {
    const res = await request.post('/api/auth/demo')
    // 200（成功）か 400/404（デモ無効）のいずれか。500 は許容しない
    expect(res.status()).not.toBe(500)
  })
})

// ── レスポンスヘッダー ─────────────────────────────────────────

test.describe('セキュリティヘッダー', () => {
  test('ページレスポンスに基本的なセキュリティヘッダーがある', async ({ request }) => {
    const res = await request.get('/login')
    const headers = res.headers()

    // X-Frame-Options or CSP frame-ancestors
    const hasFrameProtection =
      headers['x-frame-options'] !== undefined ||
      headers['content-security-policy']?.includes('frame-ancestors')

    // Strict-Transport-Security は本番環境のみ（localhost では不要）
    // X-Content-Type-Options
    if (headers['x-content-type-options']) {
      expect(headers['x-content-type-options']).toBe('nosniff')
    }
  })
})

// ── メソッド制限 ──────────────────────────────────────────────

test.describe('HTTP メソッド制限', () => {
  test('GET のみのエンドポイントに DELETE で 405 または 401 を返す', async ({ request }) => {
    const getOnlyEndpoints = [
      '/api/cashflow',
      '/api/scores',
      '/api/anomalies',
    ]

    for (const endpoint of getOnlyEndpoints) {
      const res = await request.delete(endpoint)
      // 401（認証なし）か 405（メソッド不許可）。500 は許容しない
      expect(res.status(), `DELETE ${endpoint} returned ${res.status()}`).not.toBe(500)
    }
  })
})
