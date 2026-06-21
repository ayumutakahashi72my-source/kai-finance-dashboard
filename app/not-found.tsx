import Link from 'next/link'
import { KAI } from '@/lib/kai-tokens'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: KAI.bg,
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <p
          style={{
            fontFamily: 'var(--font-jetbrains),JetBrains Mono,monospace',
            fontSize: 56,
            fontWeight: 800,
            background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            marginBottom: 16,
          }}
        >
          404
        </p>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: KAI.text1,
            marginBottom: 8,
          }}
        >
          ページが見つかりません
        </h1>
        <p
          style={{
            fontSize: 13,
            color: KAI.text3,
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          お探しのページは存在しないか、移動された可能性があります。
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            borderRadius: 12,
            background: `linear-gradient(135deg,${KAI.violet},${KAI.coral})`,
            color: KAI.bg,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            boxShadow: `0 4px 16px rgba(167,139,250,0.3)`,
          }}
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  )
}
