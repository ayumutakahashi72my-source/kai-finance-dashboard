#!/usr/bin/env tsx
/**
 * S-1: 鍵ローテーション時の再暗号化スイープスクリプト。
 *
 * Key Rotation Runbookの手順5に対応。旧鍵(--from-key-id)で暗号化された行を
 * 新鍵(MF_CREDENTIALS_CURRENT_KEY_ID)で再暗号化する。
 * 実行前提: MF_CREDENTIALS_KEYS に旧鍵・新鍵の両方が含まれていること
 *          （復号は旧鍵、書き込みは常にCURRENT鍵で行われる）。
 *
 * 実行:
 *   npx tsx scripts/rotate-mf-secrets.ts --from-key-id=1            # dry-run
 *   npx tsx scripts/rotate-mf-secrets.ts --from-key-id=1 --apply    # 実際に書き込む
 *
 * 冪等性: 対象は "v<from-key-id>:" プレフィックスの行のみのため、再実行しても安全。
 */
import { createAdminClient } from '../lib/supabase/admin'
import { encryptSecret, decryptSecret } from '../lib/credential-crypto'

const CHUNK_SIZE = 100

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const fromKeyId = parseArg('from-key-id')
  if (!fromKeyId) throw new Error('--from-key-id=<旧鍵のID> を指定してください')

  const prefix = `v${fromKeyId}:`
  const supabase = createAdminClient()

  let rotated = 0
  let failed = 0

  // apply時: 再暗号化されたrowはprefixにマッチしなくなり対象から自然に外れるため、
  // 毎回 range(0, CHUNK-1) だけを見ればよい（ページを進める必要がない）。
  // dry-run時: 書き込みをしないので、範囲をずらして全件を数え上げる。
  let from = 0
  let consecutiveNoProgress = 0
  for (;;) {
    const beforeFailed = failed
    const { data, error } = await supabase
      .from('user_settings')
      .select('id, ext_secret')
      .eq('ext_provider', 'mf')
      .like('ext_secret', `${prefix}%`)
      .order('id', { ascending: true })
      .range(apply ? 0 : from, (apply ? 0 : from) + CHUNK_SIZE - 1)

    if (error) throw new Error(`SELECT失敗: ${error.message}`)
    if (!data?.length) break

    for (const row of data) {
      rotated++
      if (!apply) continue
      try {
        const plain = decryptSecret(row.ext_secret as string)
        const reEncrypted = encryptSecret(plain) // 常にCURRENT鍵で書き込まれる
        const { error: updateErr } = await supabase
          .from('user_settings')
          .update({ ext_secret: reEncrypted })
          .eq('id', row.id)
        if (updateErr) throw updateErr
      } catch (err) {
        failed++
        console.error(`[rotate-mf-secrets] id=${row.id} の再暗号化に失敗:`, err instanceof Error ? err.message : err)
      }
    }

    // apply時、このバッチが全件失敗（＝どの行も対象から外れていない）なら無限ループなので中断する
    if (apply) {
      const newlyFailed = failed - beforeFailed
      consecutiveNoProgress = newlyFailed === data.length ? consecutiveNoProgress + 1 : 0
      if (consecutiveNoProgress >= 3) {
        console.error('[rotate-mf-secrets] 3回連続で進捗が無いため中断します。失敗したidのログを確認してください。')
        break
      }
    }

    if (data.length < CHUNK_SIZE) break
    if (!apply) from += CHUNK_SIZE
  }

  console.log(`鍵${fromKeyId}を使用中の行: ${rotated}件 / 失敗: ${failed}件`)
  console.log(apply ? '再暗号化を実行しました。件数が0になるまで再実行してください。' : 'dry-runです。--apply で実行してください。')

  if (apply && failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[rotate-mf-secrets] 致命的エラー:', err)
  process.exitCode = 1
})
