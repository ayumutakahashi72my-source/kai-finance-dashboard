import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { getEnvKey } from '@/lib/api-keys'

/**
 * 外部連携の資格情報（MoneyForwardパスワード等）をAES-256-GCMで暗号化して保存するためのユーティリティ。
 *
 * 鍵レジストリ:
 *   MF_CREDENTIALS_KEYS="1:<base64 32byte key>,2:<base64 32byte key>,..."
 *   MF_CREDENTIALS_CURRENT_KEY_ID="2"
 * 「現在の書き込み鍵」は上記レジストリの最大値からの推測ではなく、
 * MF_CREDENTIALS_CURRENT_KEY_ID で明示的に指定する（設計レビュー指摘対応）。
 * 復号は登録されている全世代の鍵を試すため、ローテーション中も旧データを読める。
 *
 * 出力フォーマット: v<keyId>:<base64 iv>:<base64 authTag>:<base64 ciphertext>
 * v<keyId>: プレフィックスが無い値は移行期間のレガシー平文とみなし、decryptSecret はそのまま返す。
 */

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const ENC_PREFIX_RE = /^v(\d+):([^:]+):([^:]+):([^:]+)$/

export class CredentialDecryptError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CredentialDecryptError'
  }
}

function loadKeyRegistry(): Map<string, Buffer> {
  const raw = getEnvKey('MF_CREDENTIALS_KEYS')
  const registry = new Map<string, Buffer>()
  if (!raw) return registry
  for (const entry of raw.split(',')) {
    const [id, b64] = entry.split(':')
    if (!id || !b64) continue
    const key = Buffer.from(b64.trim(), 'base64')
    if (key.length !== 32) {
      throw new Error(`MF_CREDENTIALS_KEYS: keyId=${id} の鍵長が32byteではありません`)
    }
    registry.set(id.trim(), key)
  }
  return registry
}

function currentKeyId(): string {
  const id = getEnvKey('MF_CREDENTIALS_CURRENT_KEY_ID')
  if (!id) throw new Error('MF_CREDENTIALS_CURRENT_KEY_ID が未設定です')
  return id
}

/** 平文をAES-256-GCMで暗号化する。常に MF_CREDENTIALS_CURRENT_KEY_ID の鍵のみを使う。 */
export function encryptSecret(plain: string): string {
  const keyId = currentKeyId()
  const registry = loadKeyRegistry()
  const key = registry.get(keyId)
  if (!key) throw new Error(`MF_CREDENTIALS_CURRENT_KEY_ID=${keyId} に対応する鍵がレジストリにありません`)

  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `v${keyId}:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

/**
 * 復号する。v<keyId>: プレフィックスが無い値はレガシー平文とみなしそのまま返す
 * （初回移行前の後方互換。移行完了後もこの分岐自体は残してよい＝実害はない）。
 */
export function decryptSecret(value: string): string {
  const match = value.match(ENC_PREFIX_RE)
  if (!match) return value // レガシー平文パススルー

  const [, keyId, ivB64, tagB64, ctB64] = match
  const registry = loadKeyRegistry()
  const key = registry.get(keyId)
  if (!key) {
    throw new CredentialDecryptError(`keyId=${keyId} に対応する鍵がレジストリにありません（ローテーション未完了または鍵の紛失の可能性）`)
  }

  try {
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')
    const ciphertext = Buffer.from(ctB64, 'base64')
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(authTag)
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return plain.toString('utf8')
  } catch (err) {
    throw new CredentialDecryptError(
      `復号に失敗しました（keyId=${keyId}）: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/** 値が暗号化済みフォーマットかどうか（移行スクリプトで対象行を絞り込むのに使う） */
export function isEncrypted(value: string): boolean {
  return ENC_PREFIX_RE.test(value)
}
