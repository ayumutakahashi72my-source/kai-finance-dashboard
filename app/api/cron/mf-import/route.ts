/**
 * MF自動取り込みCronは無効。
 * MFログインにOTP認証が必要なため自動実行不可。
 * 手動取込は /api/settings/mf/sync を使用。
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'MF自動取り込みは無効です。手動で取込してください。' }, { status: 410 })
}
