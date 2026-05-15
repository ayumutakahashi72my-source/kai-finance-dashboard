/**
 * MoneyForward Me 非公式クライアント
 * 参考: https://note.com/kloir_z/n/n45a80e92d227
 *
 * 認証フロー（2024年以降）:
 *   moneyforward.com/users/sign_in
 *     → 302 → id.moneyforward.com/sign_in?client_id=...
 *     → POST id.moneyforward.com/sign_in
 *     → 302 → moneyforward.com/... callback
 *     → _moneyforward_session が Set-Cookie される
 */

const MF_BASE = 'https://moneyforward.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'

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

// ── HTML パーサー ────────────────────────────────────────────────

function extractCsrfFromMeta(html: string): string | null {
  return (
    html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/)?.[1] ??
    html.match(/<meta\s+content="([^"]+)"\s+name="csrf-token"/)?.[1] ??
    null
  )
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
  maxHops = 8
): Promise<{ res: Response; url: string }> {
  let url = startUrl
  let res = await fetch(url, {
    headers: { Cookie: jar.header(url), 'User-Agent': UA },
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
    const loc = res.headers.get('location')!
    url = loc.startsWith('http') ? loc : (() => {
      try { return `${new URL(url).origin}${loc}` } catch { return `${MF_BASE}${loc}` }
    })()
    res = await fetch(url, {
      headers: { Cookie: jar.header(url), 'User-Agent': UA },
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

async function fetchCsrfToken(
  cookieHeader: string,
  trace: MfLoginStep[]
): Promise<string> {
  const targetUrl = `${MF_BASE}/cf`
  const res = await fetch(targetUrl, {
    headers: { Cookie: cookieHeader, 'User-Agent': UA },
  })
  if (!res.ok) {
    trace.push({ step: 'csrf_fetch', url: targetUrl, status: res.status, note: `失敗: ${res.status}` })
    throw new Error(`MFページ取得失敗: ${res.status}`)
  }
  const html = await res.text()
  const token = extractCsrfFromMeta(html)
  trace.push({
    step: 'csrf_fetch',
    url: targetUrl,
    status: res.status,
    note: token ? 'CSRFトークン取得成功' : 'CSRFトークンなし（セッション切れの可能性）',
  })
  if (!token) throw new Error('CSRFトークンが見つかりませんでした（セッション切れの可能性）')
  return token
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

  // Step 1: /users/sign_in → id.moneyforward.com までのリダイレクト追跡
  const { res: authPageRes, url: authPageUrl } = await followRedirects(
    `${MF_BASE}/users/sign_in`,
    jar,
    trace,
    '1_initial'
  )

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

  // Step 3: POST ログイン
  const loginBody = new URLSearchParams({
    ...hiddenFields,
    'user[email]': email,
    'user[password]': password,
    authenticity_token: csrf,
    commit: 'ログイン',
  })

  const loginRes = await fetch(formAction, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRF-Token': csrf,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: jar.header(formAction),
      'User-Agent': UA,
      Referer: authPageUrl,
    },
    body: loginBody.toString(),
    redirect: 'manual',
  })
  jar.apply(formAction, loginRes)

  trace.push({
    step: '3_post_login',
    url: formAction,
    status: loginRes.status,
    note: loginRes.headers.get('location')
      ? `→ ${loginRes.headers.get('location')}`
      : `location header なし cookies: [${jar.keys(formAction).join(', ')}]`,
  })

  // Step 4: コールバックのリダイレクトチェーンを追跡
  const location = loginRes.headers.get('location')
  if (location) {
    const callbackUrl = location.startsWith('http') ? location : `${MF_BASE}${location}`
    await followRedirects(callbackUrl, jar, trace, '4_callback')
  }

  // Step 5: 最終確認
  const mfCookieKeys = jar.keys(MF_BASE)
  trace.push({
    step: '5_final_check',
    url: MF_BASE,
    status: 0,
    note: `moneyforward.com cookies: [${mfCookieKeys.join(', ')}]`,
  })

  if (!jar.has(MF_BASE, '_moneyforward_session')) {
    throw new Error(
      `ログインに失敗しました（セッションcookieが未設定。MFのcookies: [${mfCookieKeys.join(', ')}]）`
    )
  }

  return jar.header(MF_BASE)
}

// ── 取引取得 ──────────────────────────────────────────────────────

/**
 * @param trace  呼び出し元から配列を渡すとステップが記録される（loginのtraceを引き継いでも良い）
 */
export async function fetchMfTransactions(
  sessionCookie: string,
  year: number,
  month: number,
  trace: MfLoginStep[] = []
): Promise<MfTransaction[]> {
  const csrfToken = await fetchCsrfToken(sessionCookie, trace)

  const txUrl = new URL(`${MF_BASE}/cf/detail_transactions`)
  txUrl.searchParams.set('year', String(year))
  txUrl.searchParams.set('month', String(month))
  txUrl.searchParams.set('page', '1')

  const res = await fetch(txUrl.toString(), {
    headers: {
      Cookie: sessionCookie,
      Accept: 'application/json, text/javascript, */*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': UA,
      Referer: `${MF_BASE}/cf`,
    },
  })

  if (!res.ok) {
    // レスポンスボディの先頭200文字をエラー詳細に含める
    const body = await res.text().catch(() => '')
    trace.push({
      step: 'fetch_transactions',
      url: txUrl.toString(),
      status: res.status,
      note: `失敗: ${res.status} body="${body.slice(0, 200)}"`,
    })
    throw new Error(`MFデータ取得失敗: ${res.status}`)
  }

  const json = (await res.json()) as {
    transaction_list?: Array<{
      id: string
      date: string
      content: string
      amount: number
      large_category_name?: string
      middle_category_name?: string
      transfer?: boolean
    }>
  }

  const all = json.transaction_list ?? []
  const filtered = all.filter((t) => !t.transfer)
  trace.push({
    step: 'fetch_transactions',
    url: txUrl.toString(),
    status: res.status,
    note: `取得 ${all.length}件（振替除く: ${filtered.length}件）`,
  })

  return filtered.map((t) => {
    const m = t.date.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
    const occurred_on = m ? `${m[1]}-${m[2]}-${m[3]}` : t.date
    return {
      occurred_on,
      payee: t.content,
      amount: t.amount,
      category_hint: [t.large_category_name, t.middle_category_name].filter(Boolean).join(' / '),
      raw_id: String(t.id),
    }
  })
}
