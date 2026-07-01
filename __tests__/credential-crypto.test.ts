import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptSecret, decryptSecret, isEncrypted, CredentialDecryptError } from '@/lib/credential-crypto'

// 32byteちょうどのダミー鍵(base64)
const KEY_1 = 'qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo='
const KEY_2 = 'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7s='

describe('credential-crypto', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.MF_CREDENTIALS_KEYS = `1:${KEY_1}`
    process.env.MF_CREDENTIALS_CURRENT_KEY_ID = '1'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('暗号化→復号の往復で元の値と一致する', () => {
    const plain = 'my-super-secret-password-123'
    const enc = encryptSecret(plain)
    expect(enc).not.toBe(plain)
    expect(decryptSecret(enc)).toBe(plain)
  })

  it('暗号化のたびに異なる暗号文になる（IVがランダムであること）', () => {
    const plain = 'same-password'
    const enc1 = encryptSecret(plain)
    const enc2 = encryptSecret(plain)
    expect(enc1).not.toBe(enc2)
    expect(decryptSecret(enc1)).toBe(plain)
    expect(decryptSecret(enc2)).toBe(plain)
  })

  it('v<keyId>: プレフィックスの無い値はレガシー平文としてそのまま返す', () => {
    const legacyPlain = 'legacy-plaintext-password'
    expect(decryptSecret(legacyPlain)).toBe(legacyPlain)
  })

  it('isEncrypted: 暗号化済みフォーマットを正しく判定する', () => {
    const enc = encryptSecret('x')
    expect(isEncrypted(enc)).toBe(true)
    expect(isEncrypted('plain-text')).toBe(false)
  })

  it('存在しない鍵IDで復号しようとするとCredentialDecryptErrorを投げる', () => {
    const enc = encryptSecret('x') // v1:...
    // 鍵1をレジストリから外す（鍵紛失をシミュレート）
    process.env.MF_CREDENTIALS_KEYS = `2:${KEY_2}`
    expect(() => decryptSecret(enc)).toThrow(CredentialDecryptError)
  })

  it('改ざんされた暗号文（authTag不一致）はCredentialDecryptErrorになる', () => {
    const enc = encryptSecret('original-value')
    const tampered = enc.slice(0, -4) + 'XXXX'
    expect(() => decryptSecret(tampered)).toThrow(CredentialDecryptError)
  })

  it('鍵ローテーション: 新鍵で暗号化した値も旧鍵で暗号化した値も、両方レジストリにあれば復号できる', () => {
    const encWithKey1 = encryptSecret('password-under-key1')

    // 鍵2を追加してCURRENTを切り替える（ローテーション）
    process.env.MF_CREDENTIALS_KEYS = `1:${KEY_1},2:${KEY_2}`
    process.env.MF_CREDENTIALS_CURRENT_KEY_ID = '2'

    const encWithKey2 = encryptSecret('password-under-key2')

    expect(decryptSecret(encWithKey1)).toBe('password-under-key1') // 旧鍵のデータも読める
    expect(decryptSecret(encWithKey2)).toBe('password-under-key2') // 新鍵のデータも読める
    expect(encWithKey2.startsWith('v2:')).toBe(true) // 新規書き込みは常にCURRENT鍵
  })

  it('MF_CREDENTIALS_CURRENT_KEY_ID が未設定だとencryptSecretはエラーを投げる', () => {
    delete process.env.MF_CREDENTIALS_CURRENT_KEY_ID
    expect(() => encryptSecret('x')).toThrow()
  })
})
