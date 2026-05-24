'use client';

import { useEffect, useState } from 'react';
import { KAI } from '@/lib/kai-tokens';

// ── Hooks ────────────────────────────────────────────────────────────
export function useCountUp(target: number, { duration = 1400, delay = 0, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const startTimer = setTimeout(() => {
      const step = (ts: number) => {
        if (start == null) start = ts;
        const t = Math.min(1, (ts - start) / duration);
        setValue(target * ease(t));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(startTimer); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function useTypewriter(text: string, { speed = 26, delay = 300, startKey = 0 } = {}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setN(0);
    let i = 0;
    const startTimer = setTimeout(() => {
      const tick = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(tick);
      }, speed);
      return () => clearInterval(tick);
    }, delay);
    return () => clearTimeout(startTimer);
  }, [text, speed, delay, startKey]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export const yen = (n: number) => '¥' + Math.round(n).toLocaleString('ja-JP');

export const MONO_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace',
  fontFeatureSettings: '"tnum" 1',
};

// ── Icons ─────────────────────────────────────────────────────────────
export type IconName =
  | 'grid' | 'chart' | 'calendar' | 'sparkle' | 'plus' | 'bell'
  | 'link' | 'pie' | 'msg' | 'arrow' | 'arrowUp' | 'arrowDown' | 'arrowRight'
  | 'refresh' | 'tag' | 'search' | 'settings' | 'coffee' | 'cart'
  | 'home' | 'user' | 'check' | 'train' | 'bag' | 'bank' | 'lock'

const ICON_PATHS: Record<IconName, React.ReactNode> = {
  grid:      <g><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></g>,
  chart:     <g><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></g>,
  calendar:  <g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>,
  sparkle:   <g><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.6 1.8L21.4 16.4l-1.8.6L19 18.8l-.6-1.8L16.6 16.4l1.8-.6z"/></g>,
  plus:      <g><path d="M12 5v14M5 12h14"/></g>,
  bell:      <g><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></g>,
  link:      <g><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g>,
  pie:       <g><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></g>,
  msg:       <g><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></g>,
  arrow:     <g><path d="M5 12h14M13 6l6 6-6 6"/></g>,
  arrowUp:   <g><path d="M12 19V5M5 12l7-7 7 7"/></g>,
  arrowDown: <g><path d="M12 5v14M5 12l7 7 7-7"/></g>,
  arrowRight:<g><path d="M5 12h14M13 5l7 7-7 7"/></g>,
  refresh:   <g><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></g>,
  tag:       <g><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/></g>,
  search:    <g><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g>,
  settings:  <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>,
  coffee:    <g><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v3M10 2v3M14 2v3"/></g>,
  cart:      <g><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></g>,
  home:      <g><path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/></g>,
  user:      <g><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g>,
  check:     <g><path d="M20 6L9 17l-5-5"/></g>,
  train:     <g><rect x="4" y="3" width="16" height="16" rx="4"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/><path d="M8 19l-2 2M16 19l2 2"/></g>,
  bag:       <g><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></g>,
  bank:      <g><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-7M15 21v-7M12 21v-7"/></g>,
  lock:      <g><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></g>,
};

export function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name as IconName] ?? <circle cx="12" cy="12" r="6"/>}
    </svg>
  );
}

// ── kai logo ──────────────────────────────────────────────────────────
export function KaiLogo({ size = 16, gradientId = 'klg' }: { size?: number; gradientId?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 9h2.5l2-4.5 3.5 9 2-4.5H15" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id={gradientId} x1="1" y1="9" x2="15" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor={KAI.violet}/><stop offset="1" stopColor={KAI.mint}/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── KaiSystemBrand ────────────────────────────────────────────────────
export function KaiSystemBrand({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const av = size === 'lg' ? 42 : size === 'md' ? 38 : 34;
  const titleSize = size === 'lg' ? 18 : size === 'md' ? 16 : 15;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'lg' ? 14 : 11 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          padding: 1.2, borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(251,148,119,.65), rgba(122,167,255,.65))',
        }}>
          <div style={{
            width: av, height: av, borderRadius: 11,
            background: KAI.bgCard,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '42%',
              background: 'linear-gradient(180deg, rgba(255,255,255,.07), transparent)',
            }}/>
            <KaiLogo size={Math.round(av * 0.46)} gradientId={`c-brand-${size}`}/>
            <span style={{ position: 'absolute', top: 3, left: 3, width: 4, height: 4, borderTop: `1px solid ${KAI.coral}99`, borderLeft: `1px solid ${KAI.coral}99` }}/>
            <span style={{ position: 'absolute', bottom: 3, right: 3, width: 4, height: 4, borderBottom: `1px solid ${KAI.blue}99`, borderRight: `1px solid ${KAI.blue}99` }}/>
          </div>
        </div>
        <span style={{
          position: 'absolute', top: -2, right: -2,
          width: 9, height: 9, borderRadius: '50%',
          background: KAI.green, border: `2px solid ${KAI.bgCard}`,
          boxShadow: '0 0 6px rgba(74,222,128,.7)',
          animation: 'kai-pulse-mint 2.4s ease-in-out infinite',
        }}/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: titleSize, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', lineHeight: 1 }}>kai</span>
          <span style={{
            fontSize: 8, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', color: KAI.text3, fontWeight: 700,
            letterSpacing: '.14em', padding: '1px 5px',
            background: 'rgba(255,255,255,.04)', border: `1px solid ${KAI.border}`,
            borderRadius: 4,
          }}>v2.4</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.14em', fontWeight: 700, marginTop: 2 }}>
          <span style={{ color: KAI.coral }}>家計簿管理</span>
          <span style={{ color: KAI.text5 }}>/</span>
          <span style={{ color: KAI.text3 }}>HH-072</span>
        </div>
      </div>
    </div>
  );
}

// ── CAvatar ───────────────────────────────────────────────────────────
export function CAvatar({ size = 32, initial = 'あ' }: { size?: number; initial?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `linear-gradient(135deg, ${KAI.coral}, ${KAI.blue})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: KAI.bg,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.4), 0 4px 10px ${KAI.coral}33`,
      letterSpacing: '-.02em', flexShrink: 0,
    }}>{initial}</div>
  );
}

// ── PhoneShell ────────────────────────────────────────────────────────
const GLOW_MAP_PHONE: Record<string, string> = {
  mint: 'radial-gradient(ellipse 320px 220px at 80% 8%, rgba(167,139,250,.10), transparent 55%), radial-gradient(ellipse 280px 180px at 12% 78%, rgba(94,234,212,.07), transparent 55%)',
  edge: 'radial-gradient(ellipse 360px 200px at 50% 0%, rgba(94,234,212,.06), transparent 60%)',
  warm: 'radial-gradient(ellipse 320px 220px at 80% 8%, rgba(251,148,119,.12), transparent 55%), radial-gradient(ellipse 280px 180px at 12% 78%, rgba(122,167,255,.07), transparent 55%)',
  none: 'none',
};

export function PhoneShell({
  children,
  width = 390,
  height = 780,
  bg = KAI.bg,
  glow = 'mint',
  radius = 44,
}: {
  children: React.ReactNode;
  width?: number;
  height?: number;
  bg?: string;
  glow?: 'mint' | 'edge' | 'warm' | 'none' | string;
  radius?: number;
}) {
  return (
    <div style={{
      width, height, background: bg,
      borderRadius: radius, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.10)',
      boxShadow: '0 20px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.04)',
      position: 'relative', display: 'flex', flexDirection: 'column',
      fontFamily: 'var(--font-sans), Inter, sans-serif', color: KAI.text1,
    }}>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          background: GLOW_MAP_PHONE[glow] ?? GLOW_MAP_PHONE.mint,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── DesktopShell ──────────────────────────────────────────────────────
const GLOW_MAP_DESKTOP: Record<string, string> = {
  mint: 'radial-gradient(ellipse 600px 360px at 78% 14%, rgba(167,139,250,.08), transparent 55%), radial-gradient(ellipse 500px 280px at 14% 86%, rgba(94,234,212,.05), transparent 55%)',
  edge: 'radial-gradient(ellipse 700px 200px at 50% 0%, rgba(94,234,212,.05), transparent 60%)',
  warm: 'radial-gradient(ellipse 600px 360px at 78% 14%, rgba(251,148,119,.09), transparent 55%), radial-gradient(ellipse 500px 280px at 14% 86%, rgba(122,167,255,.06), transparent 55%)',
};

export function DesktopShell({ children, width = 1100, height = 680, bg = '#0a0a10', glow = 'mint' }: {
  children: React.ReactNode; width?: number; height?: number; bg?: string; glow?: string;
}) {
  return (
    <div style={{
      width, height, background: bg,
      borderRadius: 18, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,.10)',
      boxShadow: '0 24px 80px rgba(0,0,0,.65)',
      position: 'relative', display: 'flex',
      fontFamily: 'var(--font-inter), Inter, sans-serif', color: KAI.text1,
    }}>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: GLOW_MAP_DESKTOP[glow] || GLOW_MAP_DESKTOP.mint,
      }}/>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,.011) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.011) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}/>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── KaiSidebar ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'ダッシュボード', icon: 'grid' },
  { id: 'budget',    label: '予算',           icon: 'pie' },
  { id: 'calendar',  label: 'カレンダー',     icon: 'calendar' },
  { id: 'ai',        label: 'AIサマリー',     icon: 'msg' },
];

export function KaiSidebar({ active = 'dashboard', accent = KAI.mint, accentSoft = 'rgba(94,234,212,.08)', brand, onNav }: {
  active?: string; accent?: string; accentSoft?: string; brand?: React.ReactNode; onNav?: (id: string) => void;
}) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, height: '100%',
      background: 'rgba(8,8,14,.82)',
      borderRight: '1px solid rgba(255,255,255,.10)',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(24px)',
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,.10)' }}>
        {brand || (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 1, borderRadius: 12, background: 'linear-gradient(135deg, rgba(167,139,250,.75), rgba(94,234,212,.75))' }}>
              <div style={{ width: 34, height: 34, background: '#0d0f1a', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KaiLogo size={16} gradientId="sidebar-logo"/>
              </div>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-.01em' }}>kai</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: KAI.text5 }}>personal finance</p>
            </div>
          </div>
        )}
      </div>
      <nav style={{ flex: 1, padding: 10 }}>
        {SIDEBAR_ITEMS.map((it, i) => {
          const isActive = it.id === active;
          return (
            <div key={it.id} onClick={() => onNav?.(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
              borderRadius: 11, fontSize: 14, fontWeight: 500,
              color: isActive ? accent : KAI.text2,
              background: isActive ? accentSoft : 'transparent',
              position: 'relative', cursor: 'pointer',
              animation: `kai-rise .5s ease-out ${.05 * i}s both`,
            }}>
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 3, height: 20, background: accent, borderRadius: 99,
                  boxShadow: `0 0 12px ${accent}55`,
                }}/>
              )}
              <Icon name={it.icon} size={18}/>
              {it.label}
            </div>
          );
        })}
      </nav>
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: 'linear-gradient(135deg, rgba(167,139,250,.4), rgba(94,234,212,.3))',
            border: '1px solid rgba(255,255,255,.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>家</div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>マイホーム</p>
            <p style={{ margin: 0, fontSize: 11, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace' }}>HOUSEHOLD</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── BottomBar ─────────────────────────────────────────────────────────
function BarItem({ item, isActive, accent }: { item: { id: string; label: string; icon: string }; isActive: boolean; accent: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '8px 10px', fontSize: 11, fontWeight: 600,
      color: isActive ? accent : KAI.text3, minWidth: 48, minHeight: 48,
      justifyContent: 'center', transition: 'color .2s',
    }}>
      <Icon name={item.icon} size={20}/>
      <span>{item.label}</span>
    </div>
  );
}

const DEFAULT_BOTTOM_ITEMS = [
  { id: 'home',     label: 'ホーム',     icon: 'grid' },
  { id: 'calendar', label: 'カレンダー', icon: 'calendar' },
  { id: 'budget',   label: '予算',       icon: 'pie' },
  { id: 'ai',       label: 'AI',         icon: 'msg' },
];

export function BottomBar({ active = 'home', accent = KAI.mint, items, variant = 'default', onAdd, onNav }: {
  active?: string; accent?: string; items?: typeof DEFAULT_BOTTOM_ITEMS; variant?: 'default' | 'fab'; onAdd?: () => void; onNav?: (id: string) => void;
}) {
  const navItems = items || DEFAULT_BOTTOM_ITEMS;
  if (variant === 'fab') {
    const left = navItems.slice(0, 2);
    const right = navItems.slice(2);
    return (
      <div style={{ padding: '8px 14px 28px', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(20,22,32,.88)', border: '1px solid rgba(255,255,255,.16)',
          borderRadius: 24, padding: '8px 12px', backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,.55)', position: 'relative',
        }}>
          {left.map(it => <div key={it.id} onClick={() => onNav?.(it.id)}><BarItem item={it} isActive={it.id === active} accent={accent}/></div>)}
          <div style={{ width: 54 }}/>
          {right.map(it => <div key={it.id} onClick={() => onNav?.(it.id)}><BarItem item={it} isActive={it.id === active} accent={accent}/></div>)}
          <button onClick={onAdd} style={{
            position: 'absolute', left: '50%', top: -14, transform: 'translateX(-50%)',
            width: 54, height: 54, borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            border: `3px solid ${KAI.bg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: KAI.bg, cursor: 'pointer', boxShadow: `0 8px 24px ${accent}55`,
            animation: 'kai-pulse-mint 2.4s ease-in-out infinite',
          }}>
            <Icon name="plus" size={22} stroke={2.4}/>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: '8px 14px 28px', position: 'relative', zIndex: 2 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        background: 'rgba(20,22,32,.88)', border: '1px solid rgba(255,255,255,.16)',
        borderRadius: 22, padding: '8px 12px', backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,.55)',
      }}>
        {navItems.map(it => <div key={it.id} onClick={() => onNav?.(it.id)}><BarItem item={it} isActive={it.id === active} accent={accent}/></div>)}
      </div>
    </div>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────
export function BarChart({ data, height = 90, accent = KAI.mint, highlight = 4, gap = 6, animKey = 0 }: {
  data: Array<{ label: string; value: number }>; height?: number; accent?: string; highlight?: number; gap?: number; animKey?: number;
}) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const isHi = i === highlight;
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label + animKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${pct}%`,
                background: isHi ? `linear-gradient(180deg, ${accent}, ${accent}77)` : 'rgba(255,255,255,.12)',
                borderRadius: '4px 4px 2px 2px',
                transformOrigin: 'bottom',
                animation: `kai-bar-grow .9s ${0.12 + i * 0.06}s cubic-bezier(.2,.8,.3,1) both`,
                boxShadow: isHi ? `0 0 16px ${accent}55` : 'none',
              }}/>
            </div>
            <div style={{ fontSize: 10, color: isHi ? accent : KAI.text4, fontWeight: isHi ? 700 : 500 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Ring ──────────────────────────────────────────────────────────────
export function Ring({ percent = 65, size = 160, stroke = 14, color = KAI.coral, track = 'rgba(255,255,255,.07)', delay = 200 }: {
  percent?: number; size?: number; stroke?: number; color?: string; track?: string; delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = c - (c * percent) / 100;
  const gradId = `ring-grad-${size}-${Math.round(percent)}`;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color}/>
          <stop offset="1" stopColor={color} stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none"/>
      <circle cx={size / 2} cy={size / 2} r={r}
        stroke={`url(#${gradId})`} strokeWidth={stroke} fill="none"
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        strokeDasharray={c}
        strokeDashoffset={target}
        style={{
          animation: `kai-ring-draw 1.4s ${delay / 1000}s cubic-bezier(.2,.8,.3,1) both`,
          ['--ring-target' as string]: target,
        }}
      />
    </svg>
  );
}

// ── StreamingDots ─────────────────────────────────────────────────────
export function StreamingDots({ color = KAI.violet, size = 5 }: { color?: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', marginLeft: 4 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: size, height: size, borderRadius: '50%', background: color,
          display: 'inline-block',
          animation: `kai-stream-dot 1.2s ${i * 0.16}s ease-in-out infinite`,
        }}/>
      ))}
    </span>
  );
}

// ── GlintLine ─────────────────────────────────────────────────────────
export function GlintLine({ color = 'rgba(94,234,212,.7)' }: { color?: string }) {
  return (
    <div style={{
      height: 1, width: '100%',
      background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      backgroundSize: '200% 100%',
      animation: 'kai-glint 4s ease-in-out infinite',
    }}/>
  );
}

// ── BlinkCaret ────────────────────────────────────────────────────────
export function BlinkCaret({ color = KAI.coral }: { color?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 1.5, height: 11, background: color,
      marginLeft: 1, verticalAlign: 'middle', animation: 'kai-blink 1s steps(2) infinite',
    }}/>
  );
}
