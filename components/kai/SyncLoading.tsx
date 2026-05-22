// components/kai/SyncLoading.tsx
// ロード画面 B "MF 同期中" の Next.js 実装。
//
// 用途:
//   - /settings/integrations/mf で「更新する」を押した後の同期中状態
//   - 起動時に MF と自動同期している間のフルスクリーンローダー
//
// 同期処理は親側で行い、その進捗 (progress 0..1) と取得済み取引の配列を
// props で渡す形にしている。ダミーデータ駆動の自走モードも提供。
//
/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN-LOCKED — Claude Code への絶対ルール                              ║
 * ║   1. 構成 (上ステータス → 進捗 % + bar → 取引フィード → footer) を       ║
 * ║      変えない。                                                          ║
 * ║   2. 進捗 bar は coral → blue グラデ固定。                               ║
 * ║   3. 取引カードの style (背景、padding、radius、icon size) は触らない。  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝ */

'use client'

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'
import { Icon, MONO_STYLE, type IconName } from '@/components/kai/shared'
import { SplashWaveMark } from '@/components/kai/HairlineSplash'

export interface SyncTxn {
  id:       string | number
  /** カテゴリ表示名 (例: "食費") */
  category: string
  /** 「-¥1,280」のような表示済み文字列 */
  amount:   string
  /** 取引のタイトル / 加盟店名 */
  title:    string
  /** アクセントカラー (KAI.coral / blue / violet 等) */
  color:    string
  /** Lucide 風アイコン名 */
  icon:     IconName
}

interface SyncLoadingProps {
  /** 0..1 の進捗。指定すると controlled モード。 */
  progress?: number
  /** 取得済みの取引 (古い順 or 新しい順 — そのまま表示)。 */
  transactions?: SyncTxn[]
  /** "MONEYFORWARD · 同期中" の上書き */
  statusLabel?: string
  /** タップで中断したい時 */
  onCancel?: () => void
  /** progress / transactions が未指定の時、ダミーで自走 (デモ用) */
  demo?: boolean
}

const DEMO_TXNS: SyncTxn[] = [
  { id: 1, category: '食費',   amount: '-¥1,280', title: 'セブンイレブン',  color: KAI.coral,  icon: 'cart'   },
  { id: 2, category: '交通',   amount: '-¥320',   title: 'メトロ 表参道',    color: KAI.blue,   icon: 'train'  },
  { id: 3, category: '娯楽',   amount: '-¥4,800', title: 'Netflix',          color: '#f9b27e',  icon: 'bag'    },
  { id: 4, category: '食費',   amount: '-¥860',   title: 'ローソン',         color: KAI.coral,  icon: 'coffee' },
  { id: 5, category: '固定費', amount: '-¥9,800', title: '電気代',           color: KAI.violet, icon: 'home'   },
]

export function SyncLoading({
  progress,
  transactions,
  statusLabel = 'MONEYFORWARD · 同期中',
  onCancel,
  demo,
}: SyncLoadingProps) {
  // ── demo モード: 自走で 0→1 進む + 取引を 1 件ずつ追加
  const [demoStep, setDemoStep] = React.useState(0)
  React.useEffect(() => {
    if (!demo) return
    const id = setInterval(() => setDemoStep((s) => Math.min(s + 1, 8)), 380)
    return () => clearInterval(id)
  }, [demo])

  const visible: SyncTxn[] = transactions
    ?? (demo ? DEMO_TXNS.slice(0, Math.min(demoStep, DEMO_TXNS.length)) : [])
  const pct = Math.max(
    0,
    Math.min(100, Math.round((progress ?? (demo ? demoStep / 8 : 0)) * 100))
  )

  return (
    <div
      onClick={onCancel}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: KAI.bgCard, // #0c0a14
        color: KAI.text1,
        fontFamily: 'var(--font-sans), Inter, sans-serif',
        overflow: 'hidden',
        cursor: onCancel ? 'pointer' : 'default',
      }}
    >
      {/* 上下のソフトグロー */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 420px 320px at 50% 22%, ${KAI.coral}18, transparent 65%),
            radial-gradient(ellipse 360px 280px at 50% 78%, ${KAI.blue}12, transparent 65%)
          `,
        }}
      />

      {/* 上部: status pill + 波マーク */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 22px) + 44px)',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 99,
            background: 'rgba(255,255,255,.04)',
            border: `1px solid ${KAI.border2}`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: KAI.success,
              boxShadow: '0 0 10px #4ade80aa',
              animation: 'kai-breathe 1.6s ease-in-out infinite',
            }}
          />
          <span
            style={{
              ...MONO_STYLE,
              fontSize: 10,
              color: KAI.text2,
              letterSpacing: '.22em',
              fontWeight: 700,
            }}
          >
            {statusLabel}
          </span>
        </div>
        <SplashWaveMark
          size={36}
          from={KAI.coral}
          to={KAI.blue}
          animateDuration={1.0}
          idPrefix="sync-mark"
        />
      </div>

      {/* 中央: 進捗 */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: 36,
          right: 36,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              ...MONO_STYLE,
              fontSize: 54,
              fontWeight: 700,
              color: KAI.text1,
              letterSpacing: '-.04em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pct}
          </span>
          <span style={{ fontSize: 18, color: KAI.text3, fontWeight: 500 }}>%</span>
        </div>
        <div
          style={{
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,.06)',
            borderRadius: 99,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${pct}%`,
              transition: 'width .35s cubic-bezier(.5,.1,.2,1)',
              background: `linear-gradient(90deg, ${KAI.coral}, ${KAI.blue})`,
              boxShadow: `0 0 12px ${KAI.coral}66`,
            }}
          />
        </div>
        <p
          style={{
            margin: 0,
            ...MONO_STYLE,
            fontSize: 10,
            letterSpacing: '.18em',
            color: KAI.text3,
            fontWeight: 600,
          }}
        >
          {visible.length} / 取引を取得中...
        </p>
      </div>

      {/* 取引の流れ込み (下端まで広がるスクロール領域) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(30% + 200px)',
          left: 24,
          right: 24,
          bottom: 'calc(env(safe-area-inset-bottom, 22px) + 70px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflow: 'hidden',
        }}
      >
        {visible.map((tx) => (
          <div
            key={tx.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: 'rgba(255,255,255,.035)',
              border: `1px solid ${KAI.border2}`,
              animation: 'kai-splash-fade .4s 0s both ease-out',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                flexShrink: 0,
                background: `${tx.color}22`,
                color: tx.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={tx.icon} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: KAI.text1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tx.title}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: KAI.text3, letterSpacing: '.04em' }}>
                {tx.category}
              </p>
            </div>
            <p
              style={{
                margin: 0,
                ...MONO_STYLE,
                fontSize: 13,
                fontWeight: 600,
                color: KAI.text1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {tx.amount}
            </p>
          </div>
        ))}
      </div>

      {/* footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom, 22px) + 24px)',
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            ...MONO_STYLE,
            fontSize: 9,
            letterSpacing: '.22em',
            color: KAI.text5,
            fontWeight: 600,
          }}
        >
          {onCancel ? 'HH-072 · 中断するにはタップ' : 'HH-072'}
        </p>
      </div>
    </div>
  )
}
