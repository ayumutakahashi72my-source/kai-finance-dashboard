#!/usr/bin/env tsx
/**
 * S-1: user_settings.ext_secret（MFパスワード）の平文→暗号化 一括移行スクリプト。
 *
 * 実行前提:
 *   - MF_CREDENTIALS_KEYS / MF_CREDENTIALS_CURRENT_KEY_ID が環境変数に設定済みであること
 *   - 暗号化・復号に対応したアプリコード（本コミット）が本番にデプロイ済みであること
 *     （後方互換の平文パススルーがあるため、このスクリプト実行前でも既存機能は壊れない）
 *
 * 実行:
 *   npx tsx scripts/migrate-mf-secrets.ts            # dry-run（対象件数のみ表示）
 *   npx tsx scripts/migrate-mf-secrets.ts --apply    # 実際に書き込む
 *
 * 冪等性: 既に "v<keyId>:" プレフィックスを持つ行はスキップするため、
 *         中断しても安全に再実行できる。
 */
import { createAdminClient } from '../lib/supabase/admin'
import { encryptSecret, isEncrypted } from '../lib/credential-crypto'

const CHUNK_SIZE = 100

async function main() {
  const apply = process.argv.includes('--apply')
  const supabase = createAdminClient()

  let migrated = 0
  let skipped = 0
  let failed = 0

  // ページネーションしながら未移行行（平文）だけを処理する
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('id, ext_secret')
      .eq('ext_provider', 'mf')
      .not('ext_secret', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + CHUNK_SIZE - 1)

    if (error) throw new Error(`SELECT失敗: ${error.message}`)
    if (!data?.length) break

    for (const row of data) {
      const secret = row.ext_secret as string
      if (isEncrypted(secret)) {
        skipped++
        continue
      }

      migrated++
      if (!apply) continue

      try {
        const encrypted = encryptSecret(secret)
        const { error: updateErr } = await supabase
          .from('user_settings')
          .update({ ext_secret: encrypted })
          .eq('id', row.id)
        if (updateErr) throw updateErr
      } catch (err) {
        failed++
        console.error(`[migrate-mf-secrets] id=${row.id} の暗号化に失敗:`, err instanceof Error ? err.message : err)
      }
    }

    if (data.length < CHUNK_SIZE) break
    from += CHUNK_SIZE
  }

  console.log(`対象: ${migrated + skipped}件 / 移行対象(平文): ${migrated}件 / 既に暗号化済み: ${skipped}件 / 失敗: ${failed}件`)
  console.log(apply ? '実行モードで完了しました。' : 'dry-runです。実際に反映するには --apply を付けて再実行してください。')

  if (apply && failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('[migrate-mf-secrets] 致命的エラー:', err)
  process.exitCode = 1
})
