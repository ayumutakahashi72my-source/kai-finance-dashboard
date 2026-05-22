// components/kai/AppIcon.tsx
// kai — Direction C "Warm Companion" のアプリアイコン (② Warm Bloom 由来)
//
// 用途:
//   - ホーム画面に追加した時の Apple/Android アプリアイコン
//   - public/app-icon.svg / app-icon.png として静的書き出し (生成済み)
//   - in-app (起動画面・設定画面など) で React コンポーネントとして使用
//
/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  DESIGN-LOCKED — Claude Code への絶対ルール                              ║
 * ║   1. グラデは coral (#fb9477) → blue (#7aa7ff) 固定。                    ║
 * ║   2. インナーの background, 丸み, コーナー切り取り (corner marks) の     ║
 * ║      配置・サイズを変更しない。                                          ║
 * ║   3. props は size のみ。色は変えられない仕様（ブランドアイコンのため）。║
 * ╚══════════════════════════════════════════════════════════════════════════╝ */

import * as React from 'react'
import { KAI } from '@/lib/kai-tokens'

interface AppIconProps {
  /** アイコンの一辺 (px)。デフォルト 96px (in-app 表示用)。 */
  size?: number
  /** SVG 内で衝突しないように gradient/id をカスタマイズしたい時に。 */
  idPrefix?: string
  /** drop-shadow を有効化 (splash 内で目立たせたい時) */
  glow?: boolean
}

export function AppIcon({ size = 96, idPrefix = 'kai-app-icon', glow = false }: AppIconProps) {
  const radius = size * 0.22                 // iOS の "squircle" 風の角丸
  const ringPad = Math.max(1.5, size * 0.018) // グラデ外周の太さ
  const cornerLen = Math.max(6, size * 0.085)
  const cornerOffset = Math.max(6, size * 0.085)
  const cornerWidth = Math.max(1, size * 0.013)
  const markSize = size * 0.58

  return (
    <div
      style={{
        width: size,
        height: size,
        padding: ringPad,
        borderRadius: radius + ringPad,
        background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
        boxShadow: glow
          ? `0 18px 48px ${KAI.coral}44, 0 8px 28px ${KAI.blue}33`
          : `0 ${size * 0.04}px ${size * 0.12}px rgba(0,0,0,.35)`,
        boxSizing: 'border-box',
        display: 'inline-block',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius,
          background: KAI.bgCard,        // #0c0a14
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 上端 42% の柔らかなハイライト (Warm Bloom のキー) */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '42%',
            background: 'linear-gradient(180deg, rgba(255,255,255,.06), transparent)',
          }}
        />

        {/* コーナー切り取りマーク (左上 coral / 右下 blue) */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: cornerOffset,
            left: cornerOffset,
            width: cornerLen,
            height: cornerLen,
            borderTop: `${cornerWidth}px solid ${KAI.coral}cc`,
            borderLeft: `${cornerWidth}px solid ${KAI.coral}cc`,
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            bottom: cornerOffset,
            right: cornerOffset,
            width: cornerLen,
            height: cornerLen,
            borderBottom: `${cornerWidth}px solid ${KAI.blue}cc`,
            borderRight: `${cornerWidth}px solid ${KAI.blue}cc`,
          }}
        />

        {/* 中央: kai 波マーク (coral → blue グラデ stroke) */}
        <svg
          width={markSize}
          height={markSize}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          style={{ display: 'block', position: 'relative', zIndex: 1 }}
        >
          <path
            d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15"
            stroke={`url(#${idPrefix}-grad)`}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id={`${idPrefix}-grad`}
              x1="1"
              y1="9"
              x2="15"
              y2="9"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={KAI.coral} />
              <stop offset="1" stopColor={KAI.blue} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
