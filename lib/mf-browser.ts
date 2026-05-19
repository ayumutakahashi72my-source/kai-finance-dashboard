/**
 * Playwright-based MoneyForward ME login & OTP submission.
 * HTTP直叩きによるOTP submitは行わない。page.goto/fill/click のみ。
 */

import type { Browser, BrowserContext, Page } from 'playwright-core'

export type MfBrowserLoginStep = {
  step: string
  url: string
  title?: string
  htmlLen?: number
  cookies?: string[]
  note?: string
}

export class MfBrowserOtpRequiredError extends Error {
  readonly otpUrl: string
  readonly storageState: string  // JSON.stringify(await context.storageState())
  constructor(otpUrl: string, storageState: string) {
    super('MFがメール認証（email_otp）を要求しています')
    this.name = 'MfBrowserOtpRequiredError'
    this.otpUrl = otpUrl
    this.storageState = storageState
  }
}

const MF_SIGN_IN = 'https://id.moneyforward.com/sign_in'
const OTP_URL_PATTERN = /email_otp/
const SUCCESS_URL_PATTERN = /moneyforward\.com(?!.*id\.moneyforward)|(\/auth\/mfid\/callback)|dashboard/

async function launchBrowser(): Promise<{ browser: Browser; isLocal: boolean }> {
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    try {
      const { chromium } = await import('playwright')
      // headless shell は Windows で 0xC0000142 クラッシュするため有頭Chromeを優先する
      // MF_HEADLESS=true を明示したときのみ headless に戻す
      const headless = process.env.MF_HEADLESS === 'true'
      const browser = await chromium.launch({
        channel: 'chrome',   // システムインストール済み Chrome を使用（headless shell 回避）
        headless,
        slowMo: 100,
      })
      return { browser, isLocal: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? (err.stack ?? '') : ''
      console.error('[mf-browser] launchBrowser failed (dev):', msg)
      console.error('[mf-browser] stack:', stack)
      throw err
    }
  } else {
    try {
      const chromium = (await import('@sparticuz/chromium-min')).default
      const { chromium: playwrightChromium } = await import('playwright-core')
      const remoteChromeUrl = process.env.CHROMIUM_REMOTE_URL
      let executablePath: string
      if (remoteChromeUrl) {
        executablePath = await chromium.executablePath(remoteChromeUrl)
      } else {
        executablePath = await chromium.executablePath()
      }
      const browser = await playwrightChromium.launch({
        args: chromium.args,
        executablePath,
        headless: true,
        slowMo: 100,
      })
      return { browser, isLocal: false }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? (err.stack ?? '') : ''
      console.error('[mf-browser] launchBrowser failed (prod):', msg)
      console.error('[mf-browser] stack:', stack)
      throw err
    }
  }
}

function cookieNames(ctx: BrowserContext): string[] {
  return ctx.cookies().then(cs => cs.map(c => c.name)).catch(() => []) as unknown as string[]
}

async function logStep(
  page: Page,
  ctx: BrowserContext,
  stepName: string,
  trace: MfBrowserLoginStep[],
  note?: string,
) {
  const url = page.url()
  const title = await page.title().catch(() => '')
  const html = await page.content().catch(() => '')
  const cookies = await ctx.cookies().then(cs => cs.map(c => c.name)).catch(() => [])
  trace.push({ step: stepName, url, title, htmlLen: html.length, cookies, note })
}

/**
 * Full browser login. On success returns _moneyforward_session cookie string.
 * On email_otp required throws MfBrowserOtpRequiredError with storageState serialized.
 */
export async function mfBrowserLogin(
  email: string,
  password: string,
  trace: MfBrowserLoginStep[] = [],
): Promise<string> {
  const { browser } = await launchBrowser()
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await ctx.newPage()

  try {
    // 1. sign_in ページへ
    await page.goto(MF_SIGN_IN, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await logStep(page, ctx, 'goto_sign_in', trace)

    // 2. メールアドレス入力
    await page.fill('input[type="email"], input[name*="email"], input[id*="email"]', email)
    await logStep(page, ctx, 'fill_email', trace)

    // 「次へ」ボタンがある場合はクリック（email → password の2段階フロー）
    const nextBtn = await page.$('button[type="submit"], input[type="submit"]')
    if (nextBtn) {
      await nextBtn.click()
      await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {})
      await logStep(page, ctx, 'after_email_submit', trace)
    }

    // 3. パスワード入力
    const pwInput = await page.waitForSelector(
      'input[type="password"], input[name*="password"]',
      { timeout: 15_000 },
    ).catch(() => null)
    if (!pwInput) throw new Error('パスワード入力フィールドが見つかりません')
    await pwInput.fill(password)
    await logStep(page, ctx, 'fill_password', trace)

    // 4. ログインボタンクリック
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]')
    if (!submitBtn) throw new Error('ログインボタンが見つかりません')
    await submitBtn.click()

    // 5. URL遷移を待機 — email_otp or success
    await page.waitForURL(
      (url) => OTP_URL_PATTERN.test(url.toString()) || SUCCESS_URL_PATTERN.test(url.toString()),
      { timeout: 30_000 },
    ).catch(() => {})

    await logStep(page, ctx, 'after_login_click', trace)

    const currentUrl = page.url()

    if (OTP_URL_PATTERN.test(currentUrl)) {
      // OTP要求 → storageState を保存してエラー送出
      const storage = await ctx.storageState()
      const storageJson = JSON.stringify(storage)
      await browser.close()
      throw new MfBrowserOtpRequiredError(currentUrl, storageJson)
    }

    // ログイン成功 → _moneyforward_session を返す
    const session = await extractMfSession(ctx)
    await browser.close()
    return session
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    console.error('[mf-browser] mfBrowserLogin error:', msg)
    console.error('[mf-browser] stack:', stack)
    await browser.close().catch(() => {})
    throw err
  }
}

/**
 * OTPを入力してセッションを取得。
 * storageStateJson は toPlaywrightStorage() で変換した Playwright storageState JSON。
 * HTTPログインで取得したセッションCookieを復元してOTPページを開く。
 */
export async function mfBrowserSubmitOtp(
  otpCode: string,
  otpUrl: string,
  storageStateJson: string,
  trace: MfBrowserLoginStep[] = [],
): Promise<string> {
  const { browser } = await launchBrowser()
  const storageState = JSON.parse(storageStateJson) as import('playwright-core').BrowserContextOptions['storageState']
  const ctx = await browser.newContext({
    storageState,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ja-JP',
  })
  const page = await ctx.newPage()

  try {
    // 1. OTPページへ直接遷移
    await page.goto(otpUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    // React SPAの描画を待つ
    await page.waitForTimeout(2500)
    await logStep(page, ctx, 'goto_otp_page', trace)

    // ログインページにリダイレクトされていたら失敗
    if (/sign_in/.test(page.url()) && !/email_otp/.test(page.url())) {
      const html = await page.content().catch(() => '')
      trace.push({ step: 'redirected_to_login', url: page.url(), htmlLen: html.length, note: html.slice(0, 2000) })
      throw new Error(`OTPページに遷移できませんでした（現在: ${page.url()}）。URLのトークンが失効しています。`)
    }

    // 2. React描画後のHTMLを保存（フォーム構造解析用）
    const preSubmitHtml = await page.content().catch(() => '')
    trace.push({
      step: 'pre_submit_html',
      url: page.url(),
      htmlLen: preSubmitHtml.length,
      note: preSubmitHtml.slice(0, 3000),
    })

    // 3. OTP入力フィールドを待機（広めのセレクタで試す）
    // まず特定セレクタ、なければ全inputにフォールバック
    const OTP_SELECTORS = [
      'input[name*="otp"]',
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"]',
      'input[type="tel"]',
      'input[type="number"]',
      'input[type="text"][maxlength]',
      'input[type="text"]',
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"])',
    ]

    let otpInput = null
    for (const sel of OTP_SELECTORS) {
      otpInput = await page.$(sel)
      if (otpInput) {
        trace.push({ step: 'otp_input_found', url: page.url(), note: `selector: ${sel}` })
        break
      }
    }

    if (!otpInput) {
      // 全inputを列挙してデバッグ
      const inputInfo = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input')).map(el => ({
          type: el.type, name: el.name, id: el.id, placeholder: el.placeholder, autocomplete: el.autocomplete,
        }))
      ).catch(() => [])
      trace.push({ step: 'otp_input_not_found', url: page.url(), note: `inputs on page: ${JSON.stringify(inputInfo)}` })
      throw new Error(`OTP入力フィールドが見つかりません（ページ: ${page.url()}）`)
    }
    await logStep(page, ctx, 'found_otp_input', trace)

    await otpInput.fill(otpCode)
    await logStep(page, ctx, 'filled_otp', trace)

    // 4. submitボタンをクリック（HTTP POSTは行わない）
    const submitBtn = await page.$(
      'button[type="submit"], input[type="submit"], button:has-text("認証"), button:has-text("送信"), button:has-text("確認"), button:has-text("ログイン")'
    )
    if (!submitBtn) throw new Error('送信ボタンが見つかりません')
    await submitBtn.click()

    // 5. URL遷移を待機 — success
    await page.waitForURL(
      (url) => {
        const s = url.toString()
        return SUCCESS_URL_PATTERN.test(s) && !OTP_URL_PATTERN.test(s)
      },
      { timeout: 30_000 },
    ).catch(() => {})

    await logStep(page, ctx, 'after_otp_submit', trace)

    const finalUrl = page.url()
    if (OTP_URL_PATTERN.test(finalUrl)) {
      throw new Error(`OTP送信後もemail_otpページに留まっています: ${finalUrl}`)
    }

    const session = await extractMfSession(ctx)
    await browser.close()
    return session
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack ?? '') : ''
    console.error('[mf-browser] mfBrowserSubmitOtp error:', msg)
    console.error('[mf-browser] stack:', stack)
    await browser.close().catch(() => {})
    throw err
  }
}

async function extractMfSession(ctx: BrowserContext): Promise<string> {
  const cookies = await ctx.cookies()
  const SESSION_NAMES = ['_moneyforward_session', '_moneybook_session']
  for (const name of SESSION_NAMES) {
    const c = cookies.find(cookie => cookie.name === name)
    if (c) return `${c.name}=${c.value}`
  }
  const names = cookies.map(c => c.name).join(', ')
  throw new Error(`セッションCookieが見つかりません。取得済みCookie: ${names}`)
}
