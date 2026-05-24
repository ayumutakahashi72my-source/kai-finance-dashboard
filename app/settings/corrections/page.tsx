import { Brain } from 'lucide-react'
import { KAI } from '@/lib/kai-tokens'
import { CorrectionHistory } from '@/components/settings/CorrectionHistory'
import Link from 'next/link'

export default function CorrectionsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px', color: KAI.text1 }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/settings" style={{
          fontSize: 11, color: KAI.text4, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16,
        }}>
          ← 設定に戻る
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${KAI.violet}18`, border: `1px solid ${KAI.violet}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: KAI.violet,
          }}><Brain size={16} strokeWidth={2}/></div>
          <div>
            <p style={{ fontSize: 10, color: KAI.violet, letterSpacing: '.16em', fontWeight: 700, textTransform: 'uppercase' }}>
              AI LEARNING
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>修正フィードバック履歴</h1>
          </div>
        </div>
      </div>

      <CorrectionHistory />
    </div>
  )
}
