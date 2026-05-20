import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mfLogin, fetchMfTransactions } from '../lib/moneyforward-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── モックファクトリ ──────────────────────────────────────────────

function makeRes(opts: {
  html?: string
  csv?: string
  json?: unknown
  setCookies?: string[]
  status?: number
  location?: string
  contentType?: string
}): Response {
  const { html, csv, json, setCookies = [], status = 200, location, contentType } = opts
  const body = json !== undefined ? JSON.stringify(json) : (csv ?? html ?? '')
  const ct = contentType ?? (
    csv !== undefined ? 'text/csv' :
    json !== undefined ? 'application/json' :
    'text/html'
  )
  return {
    ok: status >= 200 && status < 300,
    status,
    url: '',
    headers: {
      get: (key: string) => {
        if (key === 'location') return location ?? null
        if (key === 'set-cookie') return setCookies[0] ?? null
        if (key === 'content-type') return ct
        return null
      },
      getSetCookie: () => setCookies,
    },
    text: async () => body,
    json: async () => JSON.parse(body),
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  } as unknown as Response
}

// id.moneyforward.com のログインフォームページ（hidden fields 含む）
const MF_ID_LOGIN_PAGE = (csrf: string) => `
<html>
<head><meta name="csrf-token" content="${csrf}"></head>
<body>
<form action="/sign_in" method="post">
  <input type="hidden" name="authenticity_token" value="${csrf}">
  <input type="hidden" name="client_id" value="moneyforward">
  <input type="hidden" name="state" value="abc123">
  <input name="mfid_user[email]"><input name="mfid_user[password]">
</form>
</body></html>`

// moneyforward.com/sign_in → id.mf.com OAuth リンクを含むページ
const SIGN_IN_WITH_OAUTH = (oauthUrl: string) => `
<html><body>
<a href="${oauthUrl}">ログイン</a>
</body></html>`

// 標準ログイン成功フロー（302リダイレクト経由）に必要な6モックをセット
//   calls[0]: GET /sign_in → 302 to id.mf.com
//   calls[1]: GET id.mf.com/sign_in (followRedirects)
//   calls[2]: POST email (Step3)
//   calls[3]: POST password (Step4) → 302 /
//   calls[4]: GET / (Step5 followRedirects) → sets session cookie
//   calls[5]: GET /cf (Step7 verify)
function setupStandardLoginMocks(
  cookieName = '_moneyforward_session',
  cookieValue = 'sess_ok',
) {
  mockFetch.mockResolvedValueOnce(
    makeRes({ status: 302, location: 'https://id.moneyforward.com/sign_in?client_id=mf' })
  )
  mockFetch.mockResolvedValueOnce(
    makeRes({ html: MF_ID_LOGIN_PAGE('id_csrf'), setCookies: ['_id_session=abc; Path=/'] })
  )
  mockFetch.mockResolvedValueOnce(makeRes({ html: '<html></html>' })) // POST email → 200 no redirect
  mockFetch.mockResolvedValueOnce(
    makeRes({ status: 302, location: '/' }) // POST password → 302
  )
  mockFetch.mockResolvedValueOnce(
    makeRes({ html: '<html>home</html>', setCookies: [`${cookieName}=${cookieValue}; Path=/; HttpOnly`] })
  )
  mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>cf</html>' })) // Step7
}

// ── mfLogin ──────────────────────────────────────────────────────

describe('mfLogin', () => {
  beforeEach(() => mockFetch.mockReset())

  it('302リダイレクト経由で id.moneyforward.com にログインしセッション cookie を返す', async () => {
    setupStandardLoginMocks('_moneyforward_session', 'sess_ok')

    const cookie = await mfLogin('user@example.com', 'password123')
    expect(cookie).toContain('_moneyforward_session=sess_ok')
  })

  it('/sign_in が 200 のとき OAuth リンクから id.mf.com へ遷移する', async () => {
    const oauthUrl = 'https://id.moneyforward.com/sign_in?client_id=mf&state=st1'
    mockFetch.mockResolvedValueOnce(makeRes({ html: SIGN_IN_WITH_OAUTH(oauthUrl) })) // GET /sign_in → 200
    mockFetch.mockResolvedValueOnce(
      makeRes({ html: MF_ID_LOGIN_PAGE('csrf_direct'), setCookies: ['_id_session=x; Path=/'] })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html></html>' })) // POST email
    mockFetch.mockResolvedValueOnce(makeRes({ status: 302, location: '/' })) // POST password
    mockFetch.mockResolvedValueOnce(
      makeRes({ html: '<html>home</html>', setCookies: ['_moneyforward_session=direct_ok; Path=/'] })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>cf</html>' })) // Step7

    const cookie = await mfLogin('user@example.com', 'pass')
    expect(cookie).toContain('_moneyforward_session=direct_ok')
  })

  it('hidden fields（client_id, state）を POST body に含める', async () => {
    setupStandardLoginMocks()

    await mfLogin('u@e.com', 'p')

    // calls[2] が Step3 メール POST
    const postCall = mockFetch.mock.calls[2]
    const body = postCall[1]?.body as string
    expect(body).toContain('client_id=moneyforward')
    expect(body).toContain('state=abc123')
    expect(body).toContain('authenticity_token=id_csrf')
  })

  it('POST に X-CSRF-Token ヘッダーを含める', async () => {
    setupStandardLoginMocks()

    await mfLogin('u@e.com', 'p')

    const postCall = mockFetch.mock.calls[2]
    expect((postCall[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe('id_csrf')
  })

  it('最終的にセッション cookie がなければエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, location: 'https://id.moneyforward.com/sign_in?client_id=mf' })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: MF_ID_LOGIN_PAGE('csrf1') }))
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html></html>' })) // POST email → no redirect
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>ログイン失敗</html>' })) // POST password → no session

    await expect(mfLogin('bad@example.com', 'wrong')).rejects.toThrow('ログインに失敗しました')
  })

  it('CSRF meta タグがなければエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, location: 'https://id.moneyforward.com/sign_in?client_id=mf' })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>no csrf</html>' }))

    await expect(mfLogin('u@e.com', 'p')).rejects.toThrow('CSRFトークンが取得できませんでした')
  })
})

// ── fetchMfTransactions ───────────────────────────────────────────

const SESSION = '_moneyforward_session=sess_abc'

// MF CSV 形式サンプル（振替行 tx003 はスキップされる）
const SAMPLE_CSV = `日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID
2026/05/01,セブンイレブン,-1200,銀行,食費,食料品,,FALSE,tx001
2026/05/02,給与,250000,銀行,収入,給与,,FALSE,tx002
2026/05/03,振替,-5000,銀行,,,,TRUE,tx003`

function makeCsvRes(csv: string, status = 200) {
  return makeRes({ csv, status })
}

describe('fetchMfTransactions', () => {
  beforeEach(() => mockFetch.mockReset())

  it('CSV から取引リストを正しくパースして返す', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(SAMPLE_CSV))

    const txList = await fetchMfTransactions(SESSION, 2026, 5)
    expect(txList).toHaveLength(2) // 振替行 tx003 はスキップ
    expect(txList[0]).toMatchObject({
      occurred_on: '2026-05-01', payee: 'セブンイレブン',
      amount: -1200, category_hint: '食費 / 食料品', raw_id: 'tx001',
    })
  })

  it('Cookie を正しく送信する', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(SAMPLE_CSV))

    await fetchMfTransactions(SESSION, 2026, 5)

    const [, opts] = mockFetch.mock.calls[0]
    expect((opts.headers as Record<string, string>)['Cookie']).toBe(SESSION)
  })

  it('振替行をスキップする', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(SAMPLE_CSV))

    const txList = await fetchMfTransactions(SESSION, 2026, 5)
    expect(txList.every((t) => t.payee !== '振替')).toBe(true)
  })

  it('空 CSV のとき空配列を返す', async () => {
    const emptyCsv = '日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID'
    mockFetch.mockResolvedValueOnce(makeCsvRes(emptyCsv))

    expect(await fetchMfTransactions(SESSION, 2026, 5)).toHaveLength(0)
  })

  it('全試行失敗（セッション切れ）でエラーをスロー', async () => {
    // 1st attempt: 401 → falls through to CSRF path
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))
    // CSRF: 4 candidates all fail
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))

    await expect(fetchMfTransactions(SESSION, 2026, 5)).rejects.toThrow('CSRFトークンが見つかりませんでした')
  })

  it('from / to パラメータで年月を送信する', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(SAMPLE_CSV))

    await fetchMfTransactions(SESSION, 2026, 5)

    const [url] = mockFetch.mock.calls[0]
    expect(url as string).toContain('from=2026/05/01')
    expect(url as string).toContain('to=2026/05/31')
  })

  it('CSV エンドポイントの URL が正しい', async () => {
    mockFetch.mockResolvedValueOnce(makeCsvRes(SAMPLE_CSV))

    await fetchMfTransactions(SESSION, 2026, 5)

    const [url] = mockFetch.mock.calls[0]
    expect(url as string).toContain('/cf/csv')
  })
})
