/**
 * MoneyForward Me 非公式クライアント
 * 参考: https://note.com/kloir_z/n/n45a80e92d227
 *
 * 認証フロー:
 *   moneyforward.com/sign_in
 *     → 302 → id.moneyforward.com/sign_in?client_id=...
 *     → POST id.moneyforward.com/sign_in (mfid_user[email] / mfid_user[password])
 *     → 302 → moneyforward.com/... callback
 *     → _moneyforward_session が Set-Cookie される
 *
 * CSV パラメータ: from=YYYY/MM/DD  to=YYYY/MM/DD
 *
 * データ取得: GET /cf/csv?from_date=YYYY/MM/DD&to_date=YYYY/MM/DD でCSVダウンロード
 */

import { decodeCsvBuffer, parseMfCsv } from '@/lib/csv-parser'

const MF_BASE = 'https://moneyforward.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const BROWSER_HEADERS = {
  'User-Agent':                UA,
  'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language':           'ja,en-US;q=0.9,en;q=0.8',
  'Accept-Encoding':           'gzip, deflate, br',
  'Cache-Control':             'max-age=0',
  'Upgrade-Insecure-Requests': '1',
  'Connection':                'keep-alive',
} as const

const NAV_HEADERS = {
  ...BROWSER_HEADERS,
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
} as const

const NAV_SAME_SITE_HEADERS = {
  ...BROWSER_HEADERS,
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-User': '?1',
} as const

const POST_HEADERS = {
  ...BROWSER_HEADERS,
  'Content-Type':              'application/x-www-form-urlencoded',
  'Sec-Fetch-Dest':            'document',
  'Sec-Fetch-Mode':            'navigate',
  'Sec-Fetch-Site':            'same-origin',
  'Sec-Fetch-User':            '?1',
} as const

export interface MfTransaction {
  occurred_on: string // YYYY-MM-DD
  payee: string
  amount: number
  category_hint: string
  raw_id: string
}

/** ログイン処理の各ステップを記録する型 */
export interface MfLoginStep {
  step: string   // 例: "1_init_get", "3_post_login"
  url: string
  status: number
  note: string   // 例: "CSRF取得成功", "302リダイレクト → /home"
}

// ── Cookie ユーティリティ ─────────────────────────────────────────

function parseSetCookies(res: Response): string[] {
  type H = { getSetCookie?: () => string[] }
  const h = res.headers as unknown as H
  if (typeof h.getSetCookie === 'function') return h.getSetCookie()
  const raw = res.headers.get('set-cookie')
  return raw ? raw.split(/,(?=\s*[A-Za-z_]+=)/) : []
}

class CookieJar {
  private jars = new Map<string, Map<string, string>>()

  private domainOf(url: string): string {
    try { return new URL(url).hostname } catch { return url }
  }

  apply(url: string, res: Response): void {
    const domain = this.domainOf(url)
    if (!this.jars.has(domain)) this.jars.set(domain, new Map())
    const jar = this.jars.get(domain)!
    for (const header of parseSetCookies(res)) {
      const nameVal = header.split(';')[0]
      const eqIdx = nameVal.indexOf('=')
      if (eqIdx < 0) continue
      const name = nameVal.slice(0, eqIdx).trim()
      const val = nameVal.slice(eqIdx + 1).trim()
      if (name) jar.set(name, val)
    }
  }

  seed(domain: string, cookieString: string): void {
    if (!this.jars.has(domain)) this.jars.set(domain, new Map())
    const jar = this.jars.get(domain)!
    for (const part of cookieString.split(';')) {
      const eq = part.indexOf('=')
      if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim())
    }
  }

  serialize(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const [domain, jar] of this.jars) {
      if (jar.size > 0) out[domain] = Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
    }
    return out
  }

  header(url: string): string {
    const domain = this.domainOf(url)
    const jar = this.jars.get(domain) ?? new Map()
    return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
  }

  /** ドメインに存在する Cookie 名の一覧（デバッグ用、値は含まない） */
  keys(url: string): string[] {
    return [...(this.jars.get(this.domainOf(url))?.keys() ?? [])]
  }

  has(url: string, name: string): boolean {
    return this.jars.get(this.domainOf(url))?.has(name) ?? false
  }
}

export class MfOtpRequiredError extends Error {
  readonly otpUrl: string
  readonly cookieState: Record<string, string>
  readonly csrf: string
  readonly resolvedOtpUrl: string

  constructor(
    otpUrl: string,
    cookieState: Record<string, string>,
    csrf = '',
    resolvedOtpUrl = '',
  ) {
    super('MFがメール認証（email_otp）を要求しています')
    this.otpUrl = otpUrl
    this.cookieState = cookieState
    this.csrf = csrf
    this.resolvedOtpUrl = resolvedOtpUrl
  }
}

// ── HTML パーサー ────────────────────────────────────────────────

function extractCsrfFromMeta(html: string): string | null {
  return (
    html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta\s+content="([^"]+)"\s+name="csrf-token"/i)?.[1] ??
    html.match(/name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i)?.[1] ??
    null
  )
}

function extractOAuthUrl(html: string): string | null {
  // /login ページに埋め込まれた id.moneyforward.com への OAuth リンクを抽出
  const patterns = [
    /href="(https:\/\/id\.moneyforward\.com\/[^"]+)"/,
    /href='(https:\/\/id\.moneyforward\.com\/[^']+)'/,
    /action="(https:\/\/id\.moneyforward\.com\/[^"]+)"/,
    /"(https:\/\/id\.moneyforward\.com\/sign_in[^"]+)"/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].replace(/&amp;/g, '&')
  }
  return null
}

function extractFormAction(html: string, pageUrl: string): string | null {
  const m = html.match(/<form[^>]+action="([^"]+)"/)
  if (!m) return null
  const action = m[1]
  if (action.startsWith('http')) return action
  try {
    const base = new URL(pageUrl)
    return `${base.protocol}//${base.host}${action.startsWith('/') ? '' : '/'}${action}`
  } catch { return null }
}

function extractHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const patterns = [
    /<input[^>]+type="hidden"[^>]+name="([^"]*)"[^>]+value="([^"]*)"/g,
    /<input[^>]+name="([^"]*)"[^>]+type="hidden"[^>]+value="([^"]*)"/g,
    /<input[^>]+type="hidden"[^>]+value="([^"]*)"[^>]+name="([^"]*)"/g,
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      if (re.source.includes('value="([^"]*)"[^>]+name')) {
        fields[m[2]] = m[1]
      } else {
        fields[m[1]] = m[2]
      }
    }
  }
  return fields
}

// ── リダイレクト追跡 ─────────────────────────────────────────────

async function followRedirects(
  startUrl: string,
  jar: CookieJar,
  trace: MfLoginStep[],
  stepPrefix: string,
  maxHops = 8,
  referer?: string
): Promise<{ res: Response; url: string }> {
  let url = startUrl
  let res = await fetch(url, {
    headers: {
      ...NAV_SAME_SITE_HEADERS,
      Cookie: jar.header(url),
      ...(referer ? { Referer: referer } : {}),
    },
    redirect: 'manual',
  })
  jar.apply(url, res)

  trace.push({
    step: `${stepPrefix}_hop0`,
    url,
    status: res.status,
    note: res.headers.get('location')
      ? `→ ${res.headers.get('location')}`
      : `cookies: [${jar.keys(url).join(', ')}]`,
  })

  let hops = 0
  while (res.headers.get('location') && hops < maxHops) {
    const prevUrl = url
    const loc = res.headers.get('location')!
    url = loc.startsWith('http') ? loc : (() => {
      try { return `${new URL(url).origin}${loc}` } catch { return `${MF_BASE}${loc}` }
    })()
    res = await fetch(url, {
      headers: {
        ...NAV_SAME_SITE_HEADERS,
        Cookie: jar.header(url),
        Referer: prevUrl,
      },
      redirect: 'manual',
    })
    jar.apply(url, res)
    hops++

    trace.push({
      step: `${stepPrefix}_hop${hops}`,
      url,
      status: res.status,
      note: res.headers.get('location')
        ? `→ ${res.headers.get('location')}`
        : `cookies: [${jar.keys(url).join(', ')}]`,
    })
  }
  return { res, url }
}

// ── CSRF ─────────────────────────────────────────────────────────

/** クッキー文字列をマージする（新しい値で上書き） */
function mergeCookies(base: string, setCookieHeaders: string[]): string {
  const map = new Map<string, string>()
  for (const part of base.split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0) map.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim())
  }
  for (const header of setCookieHeaders) {
    const nameVal = header.split(';')[0]
    const eq = nameVal.indexOf('=')
    if (eq > 0) map.set(nameVal.slice(0, eq).trim(), nameVal.slice(eq + 1).trim())
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ')
}

async function fetchCsrfToken(
  cookieHeader: string,
  trace: MfLoginStep[]
): Promise<{ token: string; updatedCookie: string }> {
  const candidates = [
    `${MF_BASE}/cf`,
    `${MF_BASE}/cf/`,
    `${MF_BASE}/home`,
    `${MF_BASE}/`,
  ]
  for (const targetUrl of candidates) {
    try {
      const res = await fetch(targetUrl, {
        headers: { ...NAV_HEADERS, Cookie: cookieHeader, Referer: MF_BASE },
        redirect: 'follow',
      })
      // res.url はリダイレクト後の最終URL。ログインページに飛ばされていたら認証失敗
      const finalUrl = res.url || targetUrl
      const isLoginPage = finalUrl.includes('/users/sign_in') || finalUrl.includes('id.moneyforward.com/sign_in')
      if (!res.ok || isLoginPage) {
        trace.push({
          step: 'csrf_fetch', url: finalUrl, status: res.status,
          note: isLoginPage ? 'ログインページへリダイレクト（セッション切れ）' : `スキップ: ${res.status}`,
        })
        continue
      }
      const updatedCookie = mergeCookies(cookieHeader, parseSetCookies(res))
      const html = await res.text()
      const token = extractCsrfFromMeta(html)
      trace.push({
        step: 'csrf_fetch',
        url: finalUrl,
        status: res.status,
        note: token ? `CSRFトークン取得成功 (finalUrl=${finalUrl})` : `CSRFトークンなし (html=${html.length}chars finalUrl=${finalUrl})`,
      })
      if (token) return { token, updatedCookie }
    } catch (e) {
      trace.push({ step: 'csrf_fetch', url: targetUrl, status: 0, note: `例外: ${e instanceof Error ? e.message : e}` })
    }
  }
  throw new Error('CSRFトークンが見つかりませんでした（セッション切れの可能性 — MF設定画面でログイン情報を確認してください）')
}

// ── OTPページ プリフェッチ ────────────────────────────────────────

/**
 * OTPページをGETしてCSRFとセッションを確定させる。
 * mfLogin内でOTPリダイレクトを検出した直後に1回だけ呼ぶことで、
 * mfSubmitOtp内の2回目GETによるセッションrotateを回避する。
 * 返り値: [cookieState, csrf, resolvedOtpUrl] — MfOtpRequiredError の spread 用
 */
async function prefetchOtpPage(
  otpUrl: string,
  jar: CookieJar,
  trace: MfLoginStep[],
  referer: string,
): Promise<[Record<string, string>, string, string]> {
  try {
    const { res: otpRes, url: resolved } = await followRedirects(otpUrl, jar, trace, 'otp_prefetch', 4, referer)
    const html = await otpRes.text()
    const csrf = extractCsrfFromMeta(html) ?? ''
    // gon オブジェクト全体を抽出（API エンドポイント等の手がかりを探す）
    const gonMatch = html.match(/window\.gon\s*=\s*\{[^]*?(?=<\/script>)/)
    const gonSnippet = gonMatch ? gonMatch[0].slice(0, 1500).replace(/\s+/g, ' ') : ''
    // script タグのsrc属性を抽出（JSバンドルURL）
    const scriptSrcs: string[] = []
    const scriptRe = /<script[^>]+src="([^"]+)"/gi
    let sm: RegExpExecArray | null
    while ((sm = scriptRe.exec(html))) scriptSrcs.push(sm[1])
    trace.push({
      step: 'otp_prefetch',
      url: resolved,
      status: otpRes.status,
      note: `csrf=${!!csrf} scripts=[${scriptSrcs.slice(0, 3).join(', ')}] gon="${gonSnippet}"`,
    })
    return [jar.serialize(), csrf, resolved]
  } catch (e) {
    trace.push({ step: 'otp_prefetch', url: otpUrl, status: 0, note: `プリフェッチエラー: ${e instanceof Error ? e.message : e}` })
    return [jar.serialize(), '', otpUrl]
  }
}

// ── ログイン ─────────────────────────────────────────────────────

/**
 * @param trace  呼び出し元から空配列を渡すと各ステップが記録される
 */
export async function mfLogin(
  email: string,
  password: string,
  trace: MfLoginStep[] = []
): Promise<string> {
  const jar = new CookieJar()

  // Step 1: /sign_in → id.moneyforward.com へのリダイレクトを追跡
  const loginRes = await fetch(`${MF_BASE}/sign_in`, {
    headers: { ...NAV_HEADERS, Cookie: jar.header(MF_BASE) },
    redirect: 'manual',
  })
  jar.apply(`${MF_BASE}/sign_in`, loginRes)

  let authPageRes: Response
  let authPageUrl: string

  const loginLocation = loginRes.headers.get('location')
  if (loginLocation) {
    // /sign_in が 302 → id.moneyforward.com へリダイレクト（通常フロー）
    const target = loginLocation.startsWith('http') ? loginLocation : `${MF_BASE}${loginLocation}`
    trace.push({ step: '1_login', url: `${MF_BASE}/sign_in`, status: loginRes.status, note: `302 → ${target}` })
    const r = await followRedirects(target, jar, trace, '1_initial', 8, `${MF_BASE}/sign_in`)
    authPageRes = r.res; authPageUrl = r.url
  } else {
    // /sign_in が 200 → HTML から id.moneyforward.com の OAuth URL を探す
    const loginHtml = await loginRes.text()
    const oauthUrl = extractOAuthUrl(loginHtml)
    trace.push({
      step: '1_login',
      url: `${MF_BASE}/sign_in`,
      status: loginRes.status,
      note: oauthUrl ? `OAuthURL: ${oauthUrl.slice(0, 80)}` : `OAuthURL未発見 html=${loginHtml.length}chars`,
    })
    if (!oauthUrl) throw new Error('/sign_in ページから id.moneyforward.com の URL が見つかりませんでした')
    const r = await followRedirects(oauthUrl, jar, trace, '1_oauth', 8, `${MF_BASE}/sign_in`)
    authPageRes = r.res; authPageUrl = r.url
  }

  // Step 2: ログインフォームのパース
  const authHtml = await authPageRes.text()
  const csrf = extractCsrfFromMeta(authHtml)
  const formAction = extractFormAction(authHtml, authPageUrl) ?? authPageUrl
  const hiddenFields = extractHiddenFields(authHtml)

  trace.push({
    step: '2_parse_form',
    url: authPageUrl,
    status: authPageRes.status,
    note: csrf
      ? `CSRF取得成功 formAction=${formAction} hiddenKeys=[${Object.keys(hiddenFields).join(', ')}]`
      : 'CSRF取得失敗（meta[name=csrf-token]が見つかりません）',
  })

  if (!csrf) throw new Error('CSRFトークンが取得できませんでした')

  // Step 3: POST ログイン（id.moneyforward.com のフォームに送信）
  // フィールド名: mfid_user[email] / mfid_user[password]（Playwright検証済み）
  const emailBody = new URLSearchParams({
    ...hiddenFields,
    'mfid_user[email]':    email,
    'mfid_user[password]': password,
    authenticity_token: csrf,
    commit: 'ログインする',
  })

  const emailRes = await fetch(formAction, {
    method: 'POST',
    headers: {
      ...POST_HEADERS,
      'X-CSRF-Token': csrf,
      Cookie: jar.header(formAction),
      Referer: authPageUrl,
      Origin: new URL(formAction).origin,
    },
    body: emailBody.toString(),
    redirect: 'manual',
  })
  jar.apply(formAction, emailRes)

  const step3Location = emailRes.headers.get('location') ?? ''
  trace.push({
    step: '3_post_email',
    url: formAction,
    status: emailRes.status,
    note: step3Location ? `→ ${step3Location}` : `cookies: [${jar.keys(formAction).join(', ')}]`,
  })

  // email_otp に誘導された場合はOTP入力が必要
  if (step3Location.includes('email_otp')) {
    const otpUrl = step3Location.startsWith('http')
      ? step3Location
      : `${new URL(formAction).origin}${step3Location}`
    throw new MfOtpRequiredError(otpUrl, ...await prefetchOtpPage(otpUrl, jar, trace, formAction))
  }

  // Step 3b: リダイレクト先でパスワードフォームがある場合（2ステップ）
  const emailLocation = step3Location || null
  let pwFormAction = formAction
  let pwCsrf = csrf
  let pwHiddenFields = hiddenFields

  if (emailLocation) {
    const pwPageUrl = emailLocation.startsWith('http') ? emailLocation : `${new URL(formAction).origin}${emailLocation}`
    const { res: pwPageRes, url: resolvedPwUrl } = await followRedirects(pwPageUrl, jar, trace, '3b_pw_page', 8, formAction)
    const pwHtml = await pwPageRes.text()
    const newCsrf = extractCsrfFromMeta(pwHtml)
    const newAction = extractFormAction(pwHtml, resolvedPwUrl)
    const newHidden = extractHiddenFields(pwHtml)

    if (newCsrf) pwCsrf = newCsrf
    if (newAction) pwFormAction = newAction
    if (Object.keys(newHidden).length > 0) pwHiddenFields = newHidden

    trace.push({
      step: '3b_parse_pw_form',
      url: resolvedPwUrl,
      status: pwPageRes.status,
      note: newCsrf ? `パスワードフォーム取得 csrf=${!!newCsrf} action=${pwFormAction}` : 'CSRFなし（1ステップ形式）',
    })
  }

  // Step 4: パスワードをPOST（2ステップの場合のフォールバック）
  const pwBody = new URLSearchParams({
    ...pwHiddenFields,
    'mfid_user[email]':    email,
    'mfid_user[password]': password,
    authenticity_token: pwCsrf,
    commit: 'ログインする',
  })

  const pwReferer = emailLocation
    ? (emailLocation.startsWith('http') ? emailLocation : `${new URL(formAction).origin}${emailLocation}`)
    : authPageUrl

  const loginSubmitRes = await fetch(pwFormAction, {
    method: 'POST',
    headers: {
      ...POST_HEADERS,
      'X-CSRF-Token': pwCsrf,
      Cookie: jar.header(pwFormAction),
      Referer: pwReferer,
      Origin: new URL(pwFormAction).origin,
    },
    body: pwBody.toString(),
    redirect: 'manual',
  })
  jar.apply(pwFormAction, loginSubmitRes)

  const step4Location = loginSubmitRes.headers.get('location') ?? ''
  trace.push({
    step: '4_post_password',
    url: pwFormAction,
    status: loginSubmitRes.status,
    note: step4Location
      ? `→ ${step4Location}`
      : `location header なし cookies: [${jar.keys(pwFormAction).join(', ')}]`,
  })

  if (step4Location.includes('email_otp')) {
    const otpUrl = step4Location.startsWith('http')
      ? step4Location
      : `${new URL(pwFormAction).origin}${step4Location}`
    throw new MfOtpRequiredError(otpUrl, ...await prefetchOtpPage(otpUrl, jar, trace, pwFormAction))
  }

  // Step 5: コールバックのリダイレクトチェーンを追跡
  if (step4Location) {
    const callbackUrl = step4Location.startsWith('http') ? step4Location : `${MF_BASE}${step4Location}`
    await followRedirects(callbackUrl, jar, trace, '5_callback', 8, pwFormAction)
  }

  // Step 6: 最終確認（セッションcookieの存在チェック）
  const mfCookieKeys = jar.keys(MF_BASE)
  trace.push({
    step: '6_final_check',
    url: MF_BASE,
    status: 0,
    note: `moneyforward.com cookies: [${mfCookieKeys.join(', ')}]`,
  })

  const SESSION_COOKIES = ['_moneyforward_session', '_moneybook_session']
  const hasSession = SESSION_COOKIES.some((name) => jar.has(MF_BASE, name))
  if (!hasSession) {
    throw new Error(
      `ログインに失敗しました（セッションcookieが未設定。MFのcookies: [${mfCookieKeys.join(', ')}]）`
    )
  }

  // Step 7: セッション確認（ログのみ・エラーにはしない）
  const verifyRes = await fetch(`${MF_BASE}/cf`, {
    headers: { ...NAV_HEADERS, Cookie: jar.header(MF_BASE), Referer: MF_BASE },
    redirect: 'manual',
  })
  const verifyLoc = verifyRes.headers.get('location') ?? ''
  trace.push({
    step: '7_verify_session',
    url: `${MF_BASE}/cf`,
    status: verifyRes.status,
    note: verifyRes.status === 200
      ? '認証済みセッション確認OK'
      : `リダイレクト → ${verifyLoc || '(不明)'}`,
  })

  return jar.header(MF_BASE)
}

// ── OTP 認証 ──────────────────────────────────────────────────────

/**
 * mfLogin が MfOtpRequiredError を投げたとき、ユーザーが入力したコードで認証を完了させる
 * @param otpCode       ユーザーが入力した6桁コード
 * @param cookieState   MfOtpRequiredError.cookieState（シリアライズ済みCookieJar）
 * @param otpUrl        MfOtpRequiredError.otpUrl（email_otp ページURL）
 */
export async function mfSubmitOtp(
  otpCode: string,
  cookieState: Record<string, string>,
  otpUrl: string,
  trace: MfLoginStep[] = [],
  prefetchedCsrf = '',
  prefetchedResolvedUrl = '',
): Promise<string> {
  const jar = new CookieJar()
  for (const [domain, cookies] of Object.entries(cookieState)) {
    jar.seed(domain, cookies)
  }

  let csrf: string
  let resolvedOtpUrl: string
  let formAction: string
  let hiddenFields: Record<string, string>

  if (prefetchedCsrf) {
    // mfLogin プリフェッチ済み → GET をスキップ（セッション rotate 回避）
    csrf = prefetchedCsrf
    resolvedOtpUrl = prefetchedResolvedUrl || otpUrl
    formAction = resolvedOtpUrl
    hiddenFields = {}
    trace.push({
      step: 'otp_prefetch_used',
      url: resolvedOtpUrl,
      status: 0,
      note: 'mfLoginプリフェッチCSRF使用（GET回避）',
    })
  } else {
    // フォールバック: OTPページを改めてGET（プリフェッチなしの場合）
    const { res: otpPageRes, url: resolved } = await followRedirects(
      otpUrl, jar, trace, 'otp_page', 8, 'https://id.moneyforward.com'
    )
    const otpHtml = await otpPageRes.text()
    const extracted = extractCsrfFromMeta(otpHtml)
    if (!extracted) throw new Error('OTPページのCSRFトークンが見つかりませんでした')
    csrf = extracted
    resolvedOtpUrl = resolved
    formAction = extractFormAction(otpHtml, resolved) ?? resolved
    hiddenFields = extractHiddenFields(otpHtml)

    const allInputNames: string[] = []
    const inputRe = /<input([^>]*)>/gi
    let im: RegExpExecArray | null
    while ((im = inputRe.exec(otpHtml))) {
      const attrs = im[1]
      const typeM = attrs.match(/type="([^"]*)"/i)
      const nameM = attrs.match(/name="([^"]*)"/i)
      if (nameM?.[1]) allInputNames.push(`${nameM[1]}[${typeM?.[1] ?? '?'}]`)
    }
    const htmlSnippet = otpHtml.slice(0, 800).replace(/\s+/g, ' ')
    trace.push({
      step: 'otp_parse',
      url: resolved,
      status: otpPageRes.status,
      note: `csrf=${!!csrf} action=${formAction} allInputs=[${allInputNames.join(', ')}] html="${htmlSnippet}"`,
    })
  }

  const otpOrigin = new URL(formAction).origin
  // URLのクエリパラメータ（OAuth2 state/nonce等）を取得
  const urlParams = Object.fromEntries(new URL(formAction).searchParams.entries())

  // React SPA のため JSON API として送信（form-encoded の場合もフォールバック）
  const attempts = [
    // 試行1: JSON body（React SPA 標準）
    {
      label: 'json/otp_attempt',
      contentType: 'application/json',
      body: JSON.stringify({ mfid_user: { otp_attempt: otpCode }, authenticity_token: csrf }),
    },
    // 試行2: form-encoded / otp_attempt
    {
      label: 'form/otp_attempt',
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ ...hiddenFields, 'mfid_user[otp_attempt]': otpCode, authenticity_token: csrf }).toString(),
    },
    // 試行3: form-encoded / otp（旧フィールド名）
    {
      label: 'form/otp',
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ ...hiddenFields, 'mfid_user[otp]': otpCode, authenticity_token: csrf }).toString(),
    },
    // 試行4: form-encoded に OAuth2 クエリパラメータ（state/nonce 等）をボディにも含める
    {
      label: 'form/otp_with_params',
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ ...urlParams, ...hiddenFields, 'mfid_user[otp_attempt]': otpCode, authenticity_token: csrf }).toString(),
    },
    // 試行5: CSRF なし（API エンドポイントが CSRF 免除の場合）
    {
      label: 'form/no_csrf',
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({ 'mfid_user[otp_attempt]': otpCode }).toString(),
    },
  ]

  const code = otpCode.trim()
  let otpSubmitRes: Response | null = null
  let otpLoc = ''
  let lastFailRedirectUrl = ''

  for (const att of attempts) {
    // otpCode → code に差し替え
    const body = att.body
      .replace(encodeURIComponent(otpCode), encodeURIComponent(code))
      .replace(otpCode, code)
    const isJson = att.contentType === 'application/json'
    const res = await fetch(formAction, {
      method: 'POST',
      headers: {
        ...(isJson ? BROWSER_HEADERS : POST_HEADERS),
        'Content-Type':   att.contentType,
        'Accept':         isJson ? 'application/json, text/plain, */*' : 'text/html,application/xhtml+xml,*/*',
        'X-CSRF-Token':   csrf,
        ...(isJson ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
        'Sec-Fetch-Dest': isJson ? 'empty' : 'document',
        'Sec-Fetch-Mode': isJson ? 'cors' : 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        Cookie:           jar.header(formAction),
        Referer:          resolvedOtpUrl,
        Origin:           otpOrigin,
      },
      body,
      redirect: 'manual',
    })
    jar.apply(formAction, res)

    const loc = res.headers.get('location') ?? ''
    const ct  = res.headers.get('content-type') ?? ''
    const note = loc ? `status=${res.status} → ${loc}` : `status=${res.status} ct=${ct}`

    // JSONレスポンスの場合、リダイレクト先が含まれていることがある
    if (!loc && ct.includes('application/json')) {
      const json = await res.json().catch(() => ({})) as Record<string, unknown>
      const noteJson = note + ` body=${JSON.stringify(json).slice(0, 120)}`
      const redirectUri = (json.redirect_uri ?? json.location ?? '') as string
      if (redirectUri) {
        otpLoc = redirectUri
        otpSubmitRes = res
        trace.push({ step: 'otp_submit', url: formAction, status: res.status, note: `[${att.label}] ${noteJson}` })
        break
      }
    }

    // Set-Cookie ヘッダーを確認（セッション変化の診断用）
    const setCookiesAfter = jar.keys(formAction).join(', ')
    trace.push({ step: 'otp_submit', url: formAction, status: res.status, note: `[${att.label}] ${note} cookies=[${setCookiesAfter}]` })

    // email_otp へのリダイレクト → この試行は失敗、次へ
    if (loc.includes('email_otp')) {
      lastFailRedirectUrl = loc.startsWith('http') ? loc : `${otpOrigin}${loc}`
      continue
    }

    // それ以外のリダイレクト or 成功 → 採用
    otpSubmitRes = res
    otpLoc = loc
    break
  }

  if (!otpSubmitRes) {
    // リダイレクト先 GET → Railsフラッシュメッセージでエラー原因を特定
    let flashMsg = ''
    if (lastFailRedirectUrl) {
      try {
        const diagRes = await fetch(lastFailRedirectUrl, {
          headers: { ...NAV_HEADERS, Cookie: jar.header(lastFailRedirectUrl), Referer: formAction },
          redirect: 'follow',
        })
        const diagHtml = await diagRes.text()
        // Railsのflashメッセージ（<div class="alert ...">）またはテキストノード
        const flashPat = /class="[^"]*(?:alert|flash|error|notice)[^"]*"[^>]*>\s*([^<]{4,120})/i
        const flashM = diagHtml.match(flashPat)
        if (flashM) flashMsg = ` サーバーメッセージ="${flashM[1].trim()}"`
        trace.push({ step: 'otp_diag', url: lastFailRedirectUrl, status: diagRes.status, note: flashMsg || `flashなし html=${diagHtml.length}chars` })
      } catch (e) {
        trace.push({ step: 'otp_diag', url: lastFailRedirectUrl, status: 0, note: `診断GETエラー: ${e instanceof Error ? e.message : e}` })
      }
    }
    throw new Error(`認証コードが正しくありません（全フォーマットで試行失敗）${flashMsg}`)
  }

  if (otpSubmitRes.status >= 400 && otpSubmitRes.status < 500) {
    throw new Error(`OTP送信エラー: ${otpSubmitRes.status}`)
  }

  // コールバックのリダイレクトチェーンを追跡
  if (otpLoc) {
    const callbackUrl = otpLoc.startsWith('http') ? otpLoc : `${otpOrigin}${otpLoc}`
    await followRedirects(callbackUrl, jar, trace, 'otp_callback', 8, formAction)
  }

  const mfCookieKeys = jar.keys(MF_BASE)
  trace.push({
    step: 'otp_final',
    url: MF_BASE,
    status: 0,
    note: `moneyforward.com cookies: [${mfCookieKeys.join(', ')}]`,
  })

  const SESSION_COOKIES = ['_moneyforward_session', '_moneybook_session']
  const hasSession = SESSION_COOKIES.some(name => jar.has(MF_BASE, name))
  if (!hasSession) {
    throw new Error(`OTP認証後のセッション取得に失敗しました（cookies: [${mfCookieKeys.join(', ')}]）`)
  }

  return jar.header(MF_BASE)
}

// ── 取引取得 ──────────────────────────────────────────────────────

/**
 * @param trace  呼び出し元から配列を渡すとステップが記録される（loginのtraceを引き継いでも良い）
 *
 * GET /cf/csv はRailsのGETエンドポイントなのでCSRF不要。セッションcookieのみで認証。
 * /cf/detail_transactions (JSON) は2025年以降404が返るため廃止。
 */
export async function fetchMfTransactions(
  sessionCookie: string,
  year: number,
  month: number,
  trace: MfLoginStep[] = []
): Promise<MfTransaction[]> {
  const mm = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  const fromDate = `${year}/${mm}/01`
  const toDate   = `${year}/${mm}/${String(lastDay).padStart(2, '0')}`

  const cookieKeys = sessionCookie.split(';').map(p => p.split('=')[0].trim()).join(', ')
  trace.push({ step: 'csv_attempt', url: `${MF_BASE}/cf/csv`, status: 0, note: `cookies=[${cookieKeys}]` })

  /**
   * 試行順:
   * 1) ログイン直後のセッションクッキーのみ・GET（CSRFフェッチなし）
   * 2) CSRFページ取得 → 更新クッキー + CSRF ヘッダ付き GET
   * 3) 同 POST (form body)
   */
  // パラメータ名は from / to（from_date / to_date ではない）— Playwright検証済み
  // スラッシュを %2F にエンコードしないよう template string で組み立てる
  const buildCsvUrl = () => `${MF_BASE}/cf/csv?from=${fromDate}&to=${toDate}`

  type Attempt = { label: string; fn: () => Promise<Response> }
  const attempts: Attempt[] = [
    {
      label: 'GET/no-csrf',
      fn: () => fetch(buildCsvUrl(), {
        headers: {
          ...NAV_HEADERS,
          Cookie:   sessionCookie,
          Referer:  `${MF_BASE}/cf`,
          Accept:   'text/csv,application/csv,*/*',
        },
      }),
    },
  ]

  // 1回目が失敗した場合にのみ CSRF を取得して再試行するため遅延評価
  const withCsrf = async (): Promise<Attempt[]> => {
    const { token: csrf, updatedCookie } = await fetchCsrfToken(sessionCookie, trace)
    const h = {
      ...NAV_HEADERS,
      Cookie:         updatedCookie,
      Referer:        `${MF_BASE}/cf`,
      'X-CSRF-Token': csrf,
    }
    return [
      {
        label: 'GET/csrf',
        fn: () => fetch(buildCsvUrl(), { headers: { ...h, Accept: 'text/csv,application/csv,*/*' } }),
      },
      {
        label: 'POST/csrf',
        fn: () => fetch(`${MF_BASE}/cf/csv`, {
          method: 'POST',
          headers: { ...h, ...POST_HEADERS, Cookie: updatedCookie, Referer: `${MF_BASE}/cf`, 'X-CSRF-Token': csrf, Accept: 'text/csv,*/*' },
          body: new URLSearchParams({ authenticity_token: csrf, from: fromDate, to: toDate }).toString(),
        }),
      },
    ]
  }

  let res: Response | null = null
  let lastErr = ''

  for (const att of attempts) {
    const r = await att.fn()
    const ct = r.headers.get('content-type') ?? ''
    const body = r.ok ? '' : await r.text().catch(() => '')
    trace.push({ step: 'csv_attempt', url: `${MF_BASE}/cf/csv`, status: r.status, note: `[${att.label}] ct=${ct}${body ? ` body="${body.slice(0, 120)}"` : ''}` })
    if (r.ok && !ct.includes('text/html')) { res = r; break }
    lastErr = `${r.status} ct=${ct} body="${body.slice(0, 120)}"`
  }

  if (!res) {
    for (const att of await withCsrf()) {
      const r = await att.fn()
      const ct = r.headers.get('content-type') ?? ''
      const body = r.ok ? '' : await r.text().catch(() => '')
      trace.push({ step: 'csv_attempt', url: `${MF_BASE}/cf/csv`, status: r.status, note: `[${att.label}] ct=${ct}${body ? ` body="${body.slice(0, 120)}"` : ''}` })
      if (r.ok && !ct.includes('text/html')) { res = r; break }
      lastErr = `${r.status} ct=${ct} body="${body.slice(0, 120)}"`
    }
  }

  if (!res) {
    throw new Error(`MFデータ取得失敗（全試行失敗）: ${lastErr}`)
  }

  const buffer  = await res.arrayBuffer()
  const csvText = decodeCsvBuffer(buffer)
  const { rows, errors } = parseMfCsv(csvText)

  trace.push({
    step:   'fetch_transactions',
    url:    `${MF_BASE}/cf/csv`,
    status: res.status,
    note:   `CSV取得成功 ${rows.length}件${errors.length > 0 ? ` (parse errors: ${errors.length})` : ''}`,
  })

  return rows.map((r) => ({
    occurred_on:    r.occurred_on,
    payee:          r.payee,
    amount:         r.amount,
    category_hint:  r.category_hint,
    raw_id:         r.raw_id,
  }))
}
