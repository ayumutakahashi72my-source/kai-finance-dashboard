/** BOM・前後空白を除去した環境変数値を返す */
export function getEnvKey(name: string): string | undefined {
  return process.env[name]?.replace(/^﻿/, '').trim() || undefined
}
