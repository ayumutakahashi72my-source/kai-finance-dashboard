/**
 * 認証セットアップ
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD を .env.local に設定して実行。
 * Supabase で email/password 認証を有効にしておく必要がある。
 * ログイン後の Cookie を e2e/.auth/user.json に保存し、各テストで再利用する。
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')

setup('認証', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL
  const password = process.env.E2E_TEST_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_TEST_EMAIL と E2E_TEST_PASSWORD を .env.local に設定してください'
    )
  }

  await page.goto('/login')

  // メール/パスワードログインフォームがある場合
  const emailInput = page.locator('input[type="email"]')
  const passwordInput = page.locator('input[type="password"]')

  if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailInput.fill(email)
    await passwordInput.fill(password)
    await page.locator('button[type="submit"]').click()
  } else {
    // Google OAuthのみの場合はスキップ（手動でauth.jsonを作成）
    throw new Error(
      'Email/Passwordログインが見つかりません。' +
      'Supabaseでemail authを有効にするか、auth.jsonを手動で配置してください。'
    )
  }

  // ダッシュボードへのリダイレクトを待つ
  await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 10_000 })
  await page.context().storageState({ path: AUTH_FILE })
})
