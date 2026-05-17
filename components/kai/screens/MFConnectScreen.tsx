'use client';

import { KAI } from '@/lib/kai-tokens';
import { Icon, KaiLogo, CAvatar, PhoneShell, MONO_STYLE } from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE  = KAI.blue;

const FEATURES = [
  {
    icon: 'sparkle',
    bg: 'rgba(251,148,119,.18)',
    color: KAI.tangerine,
    title: '毎朝の自動同期',
    sub: '6:00 に当月の全口座を取込',
  },
  {
    icon: 'bank',
    bg: 'rgba(122,167,255,.14)',
    color: C_BLUE,
    title: '複数口座まとめて',
    sub: 'クレカ・銀行・電子マネー',
  },
  {
    icon: 'lock',
    bg: 'rgba(251,148,119,.18)',
    color: KAI.tangerine,
    title: '認証情報は暗号化',
    sub: '閲覧専用アクセスのみ',
  },
] as const;

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.03)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 10,
  padding: '11px 13px',
  fontSize: 14,
  color: KAI.text3,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

interface MFConnectScreenProps {
  onBack?: () => void;
  onConnect?: () => void;
  firstName?: string;
}

export function MFConnectScreenMobile({
  onBack,
  onConnect,
  firstName = 'あ',
}: MFConnectScreenProps) {
  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px',
      }}>
        <button
          onClick={onBack}
          style={{
            width: 30, height: 30, borderRadius: 9, border: 'none',
            background: 'rgba(255,255,255,.06)', color: KAI.text2,
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
          }}
        >‹</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 9, color: KAI.text3, fontWeight: 700,
            letterSpacing: '.14em', textTransform: 'uppercase',
            ...MONO_STYLE,
          }}>ADD ENTRY / MF</div>
          <div style={{
            fontSize: 17, fontWeight: 700, color: KAI.text1,
            marginTop: 2, letterSpacing: '-.02em', lineHeight: 1.2,
          }}>MoneyForward Me 連携</div>
        </div>

        <CAvatar size={32} initial={firstName.charAt(0)}/>
      </header>

      {/* ── Scrollable body ── */}
      <div style={{
        flex: 1, padding: '8px 18px 0',
        display: 'flex', flexDirection: 'column', gap: 12,
        overflowY: 'auto',
      }}>

        {/* ── Hero connection card ── */}
        <div style={{
          background: 'rgba(167,139,250,.06)',
          border: '1px solid rgba(167,139,250,.22)',
          borderRadius: 20, padding: '28px 20px 22px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          animation: 'kai-rise .6s ease-out both',
          boxShadow: '0 0 40px rgba(167,139,250,.05)',
        }}>

          {/* KAI ─── dot ─── MF */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', width: '100%',
          }}>

            {/* KAI icon */}
            <div style={{
              padding: 2.5, borderRadius: 18, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(251,148,119,.9) 0%, rgba(122,167,255,.85) 100%)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 16,
                background: '#13102090',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KaiLogo size={32} gradientId="mfc-screen-kai"/>
              </div>
            </div>

            {/* Animated line + dot */}
            <div style={{
              flex: 1, maxWidth: 90, height: 2,
              position: 'relative', margin: '0 8px',
            }}>
              {/* track */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(255,255,255,.15)', borderRadius: 99,
              }}/>
              {/* moving dot — vertical centering via top: 50% in the animation keyframe */}
              <div style={{
                position: 'absolute',
                top: '50%', left: 0,
                width: 10, height: 10, borderRadius: '50%',
                background: C_CORAL,
                boxShadow: `0 0 10px ${C_CORAL}99`,
                /* --mfc-line matches maxWidth above */
                ['--mfc-line' as string]: '80px',
                animation: 'mfc-dot 2s cubic-bezier(.45,0,.55,1) infinite',
              }}/>
            </div>

            {/* MF icon */}
            <div style={{
              width: 72, height: 72, borderRadius: 16, flexShrink: 0,
              background: 'rgba(14,24,52,.9)',
              border: '1px solid rgba(122,167,255,.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: C_BLUE, letterSpacing: '-.04em',
            }}>MF</div>
          </div>

          {/* Headline + subtitle */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 18, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em',
            }}>kai に MF Me を接続</div>
            <div style={{
              fontSize: 12.5, color: KAI.text3, marginTop: 7, lineHeight: 1.65,
            }}>
              連携すると、毎朝 6:00 に当月の取引が自動で取込まれます。
            </div>
          </div>
        </div>

        {/* ── Feature rows ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'rgba(255,255,255,.02)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 16, padding: '14px 16px',
                animation: `kai-rise .5s ${.12 + i * .07}s ease-out both`,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
              }}>
                <Icon name={f.icon} size={20} stroke={1.9}/>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: KAI.text3, marginTop: 2 }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Login form ── */}
        <div style={{ animation: 'kai-rise .5s .33s ease-out both' }}>
          <div style={{
            fontSize: 10, color: KAI.text3, fontWeight: 700,
            letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10,
          }}>MF ME ログイン</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Email */}
            <div style={{
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11, color: KAI.text3, fontWeight: 600, marginBottom: 7,
              }}>メールアドレス</div>
              <input
                type="email"
                placeholder="example@email.com"
                style={INPUT_STYLE}
              />
            </div>

            {/* Password */}
            <div style={{
              background: 'rgba(255,255,255,.02)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 14, padding: '12px 14px',
            }}>
              <div style={{
                fontSize: 11, color: KAI.text3, fontWeight: 600, marginBottom: 7,
              }}>パスワード</div>
              <input
                type="password"
                placeholder="••••••••"
                style={INPUT_STYLE}
              />
            </div>
          </div>
        </div>

        {/* ── Warning ── */}
        <div style={{
          background: 'rgba(251,191,36,.06)',
          border: '1px solid rgba(251,191,36,.28)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', gap: 9, alignItems: 'flex-start',
          animation: 'kai-rise .5s .42s ease-out both',
        }}>
          <span style={{ fontSize: 14, color: '#fbbf24', flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ fontSize: 12, color: 'rgba(251,191,36,.92)', lineHeight: 1.6 }}>
            非公式 API を使用。MF 仕様変更で停止する可能性あり。専用 MF サブアカウント推奨
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{
          display: 'flex', gap: 10,
          paddingBottom: 28, marginTop: 4,
          animation: 'kai-rise .5s .48s ease-out both',
        }}>
          <button
            onClick={onBack}
            style={{
              flex: 1, padding: '16px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 99,
              color: KAI.text2, fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >戻る</button>

          <button
            onClick={onConnect}
            style={{
              flex: 2, padding: '16px',
              background: `linear-gradient(135deg, ${C_CORAL} 0%, ${C_BLUE} 100%)`,
              border: 'none', borderRadius: 99,
              color: KAI.bg, fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
              boxShadow: `0 8px 24px ${C_CORAL}44`,
            }}
          >
            <Icon name="link" size={16} stroke={2.2}/>
            連携する
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
