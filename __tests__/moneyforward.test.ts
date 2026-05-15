import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mfLogin, fetchMfTransactions } from '../lib/moneyforward-client'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── モックファクトリ ──────────────────────────────────────────────

function makeRes(opts: {
  html?: string
  json?: unknown
  setCookies?: string[]
  status?: number
  location?: string
}): Response {
  const { html, json, setCookies = [], status = 200, location } = opts
  const body = json !== undefined ? JSON.stringify(json) : (html ?? '')
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => {
        if (key === 'location') return location ?? null
        if (key === 'set-cookie') return setCookies[0] ?? null
        return null
      },
      getSetCookie: () => setCookies,
    },
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response
}

const LOGIN_PAGE = (csrf: string) => `
<html>
<head><meta name="csrf-token" content="${csrf}"></head>
<body>
<form action="/users/sign_in" method="post">
  <input type="hidden" name="authenticity_token" value="${csrf}">
  <input name="user[email]"><input name="user[password]">
</form>
</body></html>`

// id.moneyforward.com/sign_in への形式（hidden fields 含む）
const MF_ID_LOGIN_PAGE = (csrf: string) => `
<html>
<head><meta name="csrf-token" content="${csrf}"></head>
<body>
<form action="/sign_in" method="post">
  <input type="hidden" name="authenticity_token" value="${csrf}">
  <input type="hidden" name="client_id" value="moneyforward">
  <input type="hidden" name="state" value="abc123">
  <input name="user[email]"><input name="user[password]">
</form>
</body></html>`

const CF_PAGE = (csrf: string) => `
<html><head><meta name="csrf-token" content="${csrf}"></head><body>CF</body></html>`

// ── mfLogin ──────────────────────────────────────────────────────

describe('mfLogin', () => {
  beforeEach(() => mockFetch.mockReset())

  it('直接ログイン（リダイレクトなし）でセッション cookie を返す', async () => {
    // followRedirects: GET /users/sign_in → 200 (ログインフォーム)
    mockFetch.mockResolvedValueOnce(
      makeRes({ html: LOGIN_PAGE('csrf1'), setCookies: ['_mf_init=x; Path=/'] })
    )
    // POST /users/sign_in → 302 → セッション cookie
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, setCookies: ['_moneyforward_session=final; Path=/'], location: '/home' })
    )
    // followRedirects: GET /home → 200
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>home</html>' }))

    const cookie = await mfLogin('user@example.com', 'password123')
    expect(cookie).toContain('_moneyforward_session=final')
  })

  it('id.moneyforward.com 経由ログインでセッション cookie を返す', async () => {
    // followRedirects step1: GET /users/sign_in → 302 → id.mf.com
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, location: 'https://id.moneyforward.com/sign_in?client_id=mf' })
    )
    // followRedirects step2: GET id.mf.com/sign_in → 200 フォーム
    mockFetch.mockResolvedValueOnce(
      makeRes({
        html: MF_ID_LOGIN_PAGE('id_csrf'),
        setCookies: ['_id_session=abc; Path=/'],
      })
    )
    // POST id.mf.com/sign_in → 302 → callback
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, location: 'https://moneyforward.com/auth/callback?code=xyz' })
    )
    // followRedirects callback: GET moneyforward.com/auth/callback → 302
    mockFetch.mockResolvedValueOnce(
      makeRes({
        status: 302,
        location: '/',
        setCookies: ['_moneyforward_session=sess_ok; Path=/; HttpOnly'],
      })
    )
    // followRedirects: GET / → 200
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>home</html>' }))

    const cookie = await mfLogin('user@example.com', 'pass')
    expect(cookie).toContain('_moneyforward_session=sess_ok')
  })

  it('hidden fields（client_id, state）を POST body に含める', async () => {
    mockFetch.mockResolvedValueOnce(
      makeRes({ html: MF_ID_LOGIN_PAGE('my_csrf'), setCookies: [] })
    )
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, setCookies: ['_moneyforward_session=ok; Path=/'], location: '/' })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html></html>' }))

    await mfLogin('u@e.com', 'p')

    const [, postCall] = mockFetch.mock.calls
    const body = postCall[1]?.body as string
    expect(body).toContain('client_id=moneyforward')
    expect(body).toContain('state=abc123')
    expect(body).toContain('authenticity_token=my_csrf')
  })

  it('POST に X-CSRF-Token ヘッダーを含める', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: LOGIN_PAGE('tok123') }))
    mockFetch.mockResolvedValueOnce(
      makeRes({ status: 302, setCookies: ['_moneyforward_session=ok; Path=/'], location: '/' })
    )
    mockFetch.mockResolvedValueOnce(makeRes({ html: '' }))

    await mfLogin('u@e.com', 'p')

    const [, postCall] = mockFetch.mock.calls
    expect((postCall[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe('tok123')
  })

  it('最終的にセッション cookie がなければエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: LOGIN_PAGE('csrf1') }))
    // POST → 200 だがセッション cookie なし
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>ログイン失敗</html>' }))

    await expect(mfLogin('bad@example.com', 'wrong')).rejects.toThrow('ログインに失敗しました')
  })

  it('CSRF meta タグがなければエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: '<html>no csrf</html>' }))

    await expect(mfLogin('u@e.com', 'p')).rejects.toThrow('CSRFトークンが取得できませんでした')
  })
})

// ── fetchMfTransactions ───────────────────────────────────────────

const SESSION = '_moneyforward_session=sess_abc'

const SAMPLE_TX = {
  transaction_list: [
    { id: 'tx001', date: '2026/05/01', content: 'セブンイレブン',
      amount: -1200, large_category_name: '食費', middle_category_name: '食料品', transfer: false },
    { id: 'tx002', date: '2026/05/02', content: '給与',
      amount: 250000, large_category_name: '収入', transfer: false },
    { id: 'tx003', date: '2026/05/03', content: '振替', amount: -5000, transfer: true },
  ],
}

describe('fetchMfTransactions', () => {
  beforeEach(() => mockFetch.mockReset())

  it('取引リストを正しくパースして返す', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('csrf_api') })) // CSRF
    mockFetch.mockResolvedValueOnce(makeRes({ json: SAMPLE_TX }))          // 取引

    const txList = await fetchMfTransactions(SESSION, 2026, 5)
    expect(txList).toHaveLength(2)
    expect(txList[0]).toMatchObject({
      occurred_on: '2026-05-01', payee: 'セブンイレブン',
      amount: -1200, category_hint: '食費 / 食料品', raw_id: 'tx001',
    })
  })

  it('X-CSRF-Token と X-Requested-With を API リクエストに含める', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('csrf_for_tx') }))
    mockFetch.mockResolvedValueOnce(makeRes({ json: { transaction_list: [] } }))

    await fetchMfTransactions(SESSION, 2026, 5)

    const [, txCall] = mockFetch.mock.calls
    const h = txCall[1]?.headers as Record<string, string>
    expect(h['X-CSRF-Token']).toBe('csrf_for_tx')
    expect(h['X-Requested-With']).toBe('XMLHttpRequest')
  })

  it('振替行をスキップする', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('tok') }))
    mockFetch.mockResolvedValueOnce(makeRes({ json: SAMPLE_TX }))

    const txList = await fetchMfTransactions(SESSION, 2026, 5)
    expect(txList.every((t) => t.payee !== '振替')).toBe(true)
  })

  it('空リストのとき空配列を返す', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('tok') }))
    mockFetch.mockResolvedValueOnce(makeRes({ json: { transaction_list: [] } }))

    expect(await fetchMfTransactions(SESSION, 2026, 5)).toHaveLength(0)
  })

  it('/cf が 403 → MFページ取得失敗エラー', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ status: 403 }))
    await expect(fetchMfTransactions(SESSION, 2026, 5)).rejects.toThrow('MFページ取得失敗: 403')
  })

  it('取引取得が 401 → MFデータ取得失敗エラー', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('tok') }))
    mockFetch.mockResolvedValueOnce(makeRes({ status: 401 }))
    await expect(fetchMfTransactions(SESSION, 2026, 5)).rejects.toThrow('MFデータ取得失敗: 401')
  })

  it('year・month を正しいクエリパラメータで送信する', async () => {
    mockFetch.mockResolvedValueOnce(makeRes({ html: CF_PAGE('tok') }))
    mockFetch.mockResolvedValueOnce(makeRes({ json: { transaction_list: [] } }))

    await fetchMfTransactions(SESSION, 2026, 5)

    const [, txCall] = mockFetch.mock.calls
    expect(txCall[0] as string).toContain('year=2026')
    expect(txCall[0] as string).toContain('month=5')
  })
})
