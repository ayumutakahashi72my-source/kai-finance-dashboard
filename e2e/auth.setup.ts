import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('認証', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // デモボタンを探す（クライアントJSがhydrateされるのを待つ）
  const demoBtn = page.locator('button', { hasText: 'デモとして閲覧する' })
  const hasDemoBtn = await demoBtn.isVisible({ timeout: 15_000 }).catch(() => false)

  if (hasDemoBtn) {
    await demoBtn.click()
    await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 30_000 })
    await page.context().storageState({ path: AUTH_FILE })
    return
  }

  // デモボタンがない場合: Supabase JS client経由で直接ログイン
  // DEMO_USER_EMAIL/PASSWORD または E2E_TEST_EMAIL/PASSWORD を使用
  const email = process.env.E2E_TEST_EMAIL ?? process.env.DEMO_USER_EMAIL
  const password = process.env.E2E_TEST_PASSWORD ?? process.env.DEMO_USER_PASSWORD

  if (!email || !password) {
    throw new Error(
      'デモボタンが見つからず、E2E_TEST_EMAIL/E2E_TEST_PASSWORD も DEMO_USER_EMAIL/DEMO_USER_PASSWORD も未設定です。'
    )
  }

  // ブラウザコンテキスト内でSupabaseクライアントを使って直接ログイン
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。')
  }

  const loginResult = await page.evaluate(
    async ({ url, key, email, password }) => {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return { error: await res.text() }
      const data = await res.json()
      // Supabase SSR stores tokens in cookies, but we can also set localStorage
      localStorage.setItem(
        `sb-${new URL(url).hostname.split('.')[0]}-auth-token`,
        JSON.stringify({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
          expires_in: data.expires_in,
          token_type: data.token_type,
          user: data.user,
        })
      )
      return { ok: true, userId: data.user?.id }
    },
    { url: supabaseUrl, key: supabaseKey, email, password }
  )

  if ('error' in loginResult) {
    throw new Error(`Supabase ログイン失敗: ${loginResult.error}`)
  }

  // ログイン後にダッシュボードにアクセスしてCookieを取得
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await page.context().storageState({ path: AUTH_FILE })
})
