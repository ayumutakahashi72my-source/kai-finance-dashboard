'use client';

import { KAI } from '@/lib/kai-tokens';
import { Icon, KaiSystemBrand, CAvatar, PhoneShell, DesktopShell, KaiSidebar, MONO_STYLE } from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;
const C_CORAL_SOFT = KAI.coralSoft;

function SettingsRow({ icon, tone = C_CORAL, title, sub, badge, badgeTone, idx = 0, last, onClick }: {
  icon: string; tone?: string; title: string; sub: string;
  badge?: string; badgeTone?: string; idx?: number; last?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer',
      borderBottom: last ? '0' : '1px solid rgba(255,255,255,.04)',
      animation: `kai-rise .4s ${0.1 + idx * 0.04}s ease-out both`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: `${tone}1a`, border: `1px solid ${tone}33`, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={icon} size={16} stroke={1.9}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: KAI.text1, fontWeight: 500 }}>{title}</span>
          {badge && badgeTone && (
            <span style={{
              fontSize: 9, ...MONO_STYLE, fontWeight: 700, letterSpacing: '.08em',
              color: badgeTone, background: `${badgeTone}1a`, border: `1px solid ${badgeTone}33`,
              borderRadius: 5, padding: '1px 5px',
            }}>{badge}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ color: KAI.text5, fontSize: 16 }}>›</span>
    </div>
  );
}

function SettingsGroup({ label, children, delay = 0 }: {
  label: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <div style={{ animation: `kai-rise .5s ${delay}s ease-out both` }}>
      <div style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, marginBottom: 8, paddingLeft: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

interface SettingsScreenProps {
  displayName?: string;
  email?: string;
  onBack?: () => void;
  onNavClick?: (id: string) => void;
}

export function SettingsScreenMobile({ displayName = 'Ayu Takahashi', email = 'ayu.nao72@gmail.com', onBack }: SettingsScreenProps) {
  const initial = displayName.charAt(0);
  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <button onClick={onBack} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,.04)', color: KAI.text2, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: KAI.text3, ...MONO_STYLE, letterSpacing: '.14em', fontWeight: 700 }}>kai / 設定</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: KAI.text1, marginTop: 1 }}>設定</div>
        </div>
        <CAvatar size={28} initial={initial}/>
      </header>

      <div style={{ flex: 1, padding: '16px 18px 28px', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        {/* User card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,148,119,.06), rgba(122,167,255,.04))',
          border: '1px solid rgba(251,148,119,.18)',
          borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
          animation: 'kai-rise .5s ease-out both',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: KAI.bg, letterSpacing: '-.02em',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,.4), 0 6px 16px ${C_CORAL}3a`,
            }}>{initial}</div>
            <span style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 14, height: 14, borderRadius: '50%',
              background: '#4ade80', border: `3px solid ${KAI.bgCard}`,
              boxShadow: '0 0 8px rgba(74,222,128,.6)',
            }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: KAI.text1, letterSpacing: '-.01em' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2, ...MONO_STYLE, letterSpacing: '.04em' }}>{email}</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 9, ...MONO_STYLE, fontWeight: 700, letterSpacing: '.1em',
                background: 'rgba(94,234,212,.1)', border: '1px solid rgba(94,234,212,.22)',
                color: '#5eead4', borderRadius: 5, padding: '2px 6px',
              }}>● Google</span>
              <span style={{
                fontSize: 9, ...MONO_STYLE, fontWeight: 700, letterSpacing: '.1em',
                background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.22)',
                color: '#a78bfa', borderRadius: 5, padding: '2px 6px',
              }}>PRO</span>
            </div>
          </div>
        </div>

        {/* Household identity */}
        <div style={{
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'kai-rise .5s .08s ease-out both',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>家</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: KAI.text1, fontWeight: 600 }}>マイホーム</div>
            <div style={{ fontSize: 10, color: KAI.text3, marginTop: 2, ...MONO_STYLE, letterSpacing: '.14em', fontWeight: 700 }}>HH-072 · 2 メンバー</div>
          </div>
          <button style={{ fontSize: 11, color: C_CORAL, background: 'rgba(251,148,119,.08)', border: '1px solid rgba(251,148,119,.22)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>切替</button>
        </div>

        <SettingsGroup label="データ" delay={0.14}>
          <SettingsRow icon="link"    tone={C_BLUE}   title="MoneyForward Me 連携" sub="毎朝 6:00 自動取込 · HH-072" badge="LIVE" badgeTone="#4ade80" idx={0}/>
          <SettingsRow icon="refresh" tone="#a78bfa"  title="CSV 取込み履歴"        sub="直近 3件 · 累計 152件" idx={1}/>
          <SettingsRow icon="tag"     tone={C_CORAL}  title="カテゴリ管理"           sub="12 カテゴリ · 追加・編集" idx={2}/>
          <SettingsRow icon="pie"     tone={C_PEACH}  title="予算設定"               sub="¥200,000 / 月" idx={3} last/>
        </SettingsGroup>

        <SettingsGroup label="アプリ" delay={0.22}>
          <SettingsRow icon="bell"    tone="#fbbf24"  title="通知設定"               sub="月次レポート · 予算アラート" idx={0}/>
          <SettingsRow icon="sparkle" tone="#a78bfa"  title="AI サマリー"            sub="haiku 4.5 · 毎朝 06:04 配信" badge="AI" badgeTone="#a78bfa" idx={1}/>
          <SettingsRow icon="user"    tone={C_BLUE}   title="プロフィール"           sub="名前・アバター・通貨" idx={2} last/>
        </SettingsGroup>

        <SettingsGroup label="セキュリティ" delay={0.3}>
          <SettingsRow icon="check"    tone="#4ade80"  title="生体認証"               sub="Face ID で起動時ロック" badge="ON" badgeTone="#4ade80" idx={0}/>
          <SettingsRow icon="settings" tone={C_BLUE}   title="データのエクスポート"   sub="CSV / JSON でダウンロード" idx={1} last/>
        </SettingsGroup>

        <div style={{ marginTop: 8, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: KAI.text5, ...MONO_STYLE, letterSpacing: '.14em', fontWeight: 700 }}>kai v2.4.0 · HH-072 · BUILD 2026.05.16</div>
        </div>
      </div>
    </PhoneShell>
  );
}

export function SettingsScreenDesktop({ displayName = 'Ayu Takahashi', email = 'ayu.nao72@gmail.com', onNavClick }: SettingsScreenProps) {
  const C_PEACH = KAI.peach;
  const initial = displayName.charAt(0);
  return (
    <DesktopShell width={1100} height={680} glow="warm" bg={KAI.bgCard}>
      <KaiSidebar active="" accent={C_CORAL} accentSoft={C_CORAL_SOFT} brand={<KaiSystemBrand size="md"/>} onNav={onNavClick}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>設定</span>
          <CAvatar size={36} initial={initial}/>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 0, overflow: 'hidden' }}>
          {/* Left: User card + nav */}
          <div style={{ padding: '22px 24px', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,148,119,.06), rgba(122,167,255,.04))',
              border: '1px solid rgba(251,148,119,.18)',
              borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14,
              animation: 'kai-rise .5s ease-out both',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: KAI.bg,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,.4), 0 6px 16px ${C_CORAL}3a`,
                }}>{initial}</div>
                <span style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#4ade80', border: `3px solid ${KAI.bgCard}`, boxShadow: '0 0 8px rgba(74,222,128,.6)' }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>{displayName}</div>
                <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2, ...MONO_STYLE }}>{email}</div>
              </div>
            </div>

            <SettingsGroup label="データ" delay={0.1}>
              <SettingsRow icon="link"    tone={C_BLUE}   title="MoneyForward Me 連携" sub="毎朝 6:00 自動取込" badge="LIVE" badgeTone="#4ade80" idx={0}/>
              <SettingsRow icon="refresh" tone="#a78bfa"  title="CSV 取込み履歴"        sub="直近 3件" idx={1}/>
              <SettingsRow icon="tag"     tone={C_CORAL}  title="カテゴリ管理"           sub="12 カテゴリ" idx={2}/>
              <SettingsRow icon="pie"     tone={C_PEACH}  title="予算設定"               sub="¥200,000 / 月" idx={3} last/>
            </SettingsGroup>

            <SettingsGroup label="アプリ" delay={0.2}>
              <SettingsRow icon="bell"    tone="#fbbf24"  title="通知設定"              sub="月次レポート" idx={0}/>
              <SettingsRow icon="sparkle" tone="#a78bfa"  title="AI サマリー"           sub="haiku 4.5" badge="AI" badgeTone="#a78bfa" idx={1}/>
              <SettingsRow icon="user"    tone={C_BLUE}   title="プロフィール"          sub="名前・アバター" idx={2} last/>
            </SettingsGroup>
          </div>

          {/* Right: Detail panel */}
          <div style={{ padding: '22px 30px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700 }}>MoneyForward Me 連携</div>
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              animation: 'kai-rise .5s ease-out both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 1, borderRadius: 12, background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})` }}>
                  <div style={{ width: 48, height: 48, background: KAI.bgCard, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: KAI.text1 }}>k</div>
                </div>
                <div style={{ width: 80, position: 'relative', height: 2 }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.10)', borderRadius: 99 }}/>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 99, background: `linear-gradient(90deg, transparent, ${C_CORAL}, transparent)`, backgroundSize: '200% 100%', animation: 'kai-glint 1.6s linear infinite' }}/>
                </div>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(122,167,255,.10)', border: '1px solid rgba(122,167,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C_BLUE, ...MONO_STYLE, letterSpacing: '-.05em' }}>MF</div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.22)', borderRadius: 99, padding: '4px 12px', fontWeight: 700, letterSpacing: '.06em' }}>● 同期中 · 12 件追加</span>
              <div style={{ fontSize: 11, color: KAI.text3 }}>毎朝 6:00 に自動同期 · 次回 06:00</div>
            </div>

            <div style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.22)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'rgba(251,191,36,.92)', lineHeight: 1.5 }}>
              ⚠ 非公式 API を使用。MF 仕様変更で停止する可能性あり。専用 MF サブアカウント推奨。
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
