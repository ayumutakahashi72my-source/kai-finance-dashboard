'use client';

import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import { KAI } from '@/lib/kai-tokens';
import {
  useCountUp, Icon, KaiSystemBrand, CAvatar,
  PhoneShell, BottomBar, Ring, yen, MONO_STYLE,
} from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;

const C_CATEGORIES = [
  { name: '食費',   value: 48200, budget: 60000, color: C_CORAL,        icon: 'cart' },
  { name: '交通',   value: 18400, budget: 25000, color: C_BLUE,          icon: 'train' },
  { name: '娯楽',   value: 32100, budget: 30000, color: KAI.tangerine,   icon: 'bag' },
  { name: '固定費', value: 44150, budget: 45000, color: KAI.violet,      icon: 'home' },
];

const C_RECENT = [
  { icon: 'cart',   label: 'スーパー 成城石井', amount: 3420, color: C_CORAL, time: '19:42' },
  { icon: 'coffee', label: 'Blue Bottle',       amount: 680,  color: C_PEACH, time: '11:08' },
  { icon: 'train',  label: 'JR東日本 IC',       amount: 1000, color: C_BLUE,  time: '09:24' },
];

const C_UPCOMING = [
  { date: '5/25', label: 'Netflix', amount: 1490,  color: '#a78bfa', days: 9 },
  { date: '5/27', label: '家賃',   amount: 85000, color: C_CORAL,   days: 11 },
  { date: '6/02', label: '電気',   amount: 7800,  color: '#fbbf24', days: 17 },
  { date: '6/05', label: 'Spotify', amount: 980,   color: '#4ade80', days: 20 },
];

const C_GOAL = { name: '京都旅行', target: 150000, current: 80000 };

// ── モジュールスコープ定数（毎レンダーでオブジェクト生成しない） ──
const S_CHIP_WRAP = {
  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14, padding: '10px 12px',
} as const;
const S_CHIP_ROW = { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } as const;
const S_CHIP_TRACK = { marginTop: 6, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' } as const;

const S_RECENT_WRAP = {
  background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14, padding: '10px 12px', animation: 'kai-rise .6s .25s ease-out both',
} as const;
const S_RECENT_HDR = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 } as const;
const S_RECENT_HDR_L = { display: 'flex', alignItems: 'baseline', gap: 8 } as const;
const S_RECENT_ROWS = { display: 'flex', flexDirection: 'column' as const, gap: 5 };

const CategoryChip = React.memo(function CategoryChip({ name, value, budget, color, icon, idx }: {
  name: string; value: number; budget: number; color: string; icon: string; idx: number;
}) {
  const pct = Math.min(100, (value / budget) * 100);
  const over = value > budget;
  const animatedPct = useCountUp(pct, { duration: 1200, delay: 400 + idx * 80 });
  return (
    <div style={S_CHIP_WRAP}>
      <div style={S_CHIP_ROW}>
        <div style={{
          width: 22, height: 22, borderRadius: 7,
          background: `${color}22`, border: `1px solid ${color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          <Icon name={icon} size={12} stroke={2}/>
        </div>
        <span style={{ fontSize: 12, color: KAI.textBody, fontWeight: 500 }}>{name}</span>
        {over && <span style={{ marginLeft: 'auto', fontSize: 10, color: KAI.red }}>⚠</span>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, ...MONO_STYLE, color: over ? KAI.red : KAI.text1, letterSpacing: '-.01em' }}>
        ¥{value.toLocaleString('ja-JP')}
      </div>
      <div style={S_CHIP_TRACK}>
        <div style={{
          height: '100%', width: `${Math.min(100, animatedPct)}%`,
          background: over ? KAI.red : color, borderRadius: 99,
        }}/>
      </div>
      <div style={{ fontSize: 9, color: KAI.text4, marginTop: 3, ...MONO_STYLE }}>
        / ¥{budget.toLocaleString('ja-JP')}
      </div>
    </div>
  );
});

interface DashboardMobileProps {
  firstName?: string;
  streak?: number;
  dateStr?: string;
  totalSpend?: number;
  todaySpend?: number;
  onAddClick?: () => void;
  onNavClick?: (id: string) => void;
  activeTab?: string;
}

export function DashboardMobile({
  firstName = 'あゆ',
  streak = 8,
  dateStr,
  totalSpend,
  todaySpend,
  onAddClick,
  onNavClick,
  activeTab = 'home',
}: DashboardMobileProps) {
  const now = new Date();
  const displayDate = dateStr || `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  const hour = now.getHours();
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';

  const total = useCountUp(totalSpend ?? 142850, { duration: 1500 });
  const todayTotal = useCountUp(todaySpend ?? 4100, { duration: 1100, delay: 600 });
  const goalPct = (C_GOAL.current / C_GOAL.target) * 100;

  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
      }}>
        <KaiSystemBrand size="sm"/>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {streak > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.25)',
              borderRadius: 99, padding: '4px 9px', fontSize: 11, color: C_CORAL, fontWeight: 700,
            }}>
              <Flame size={12} strokeWidth={2}/> <span style={{ ...MONO_STYLE }}>{streak}日</span>
            </span>
          )}
          <CAvatar size={32} initial={firstName.charAt(0)}/>
        </div>
      </header>

      <div style={{ flex: 1, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {/* greeting line */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12.5, color: KAI.text2 }}>
            {greeting}、<span style={{ color: KAI.text1, fontWeight: 600 }}>{firstName}さん</span>
          </div>
          <span style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE, letterSpacing: '.1em' }}>{displayDate}</span>
        </div>

        {/* Hero Ring with mini goal ring */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginTop: 2, animation: 'kai-rise .8s ease-out both' }}>
          <Ring percent={71} size={180} stroke={12} color={C_CORAL} delay={300}/>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase' }}>今月の支出</div>
            <div style={{
              ...MONO_STYLE, fontWeight: 700, fontSize: 27, color: KAI.text1,
              letterSpacing: '-.02em', marginTop: 2,
            }}>{yen(total)}</div>
            <div style={{ fontSize: 10, color: C_CORAL, fontWeight: 600, marginTop: 3 }}>残り ¥57,150</div>
            <div style={{ fontSize: 9, color: KAI.text4, marginTop: 1, ...MONO_STYLE }}>22 days left</div>
          </div>
          {/* mini goal ring badge */}
          <div style={{
            position: 'absolute', right: 14, top: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            animation: 'kai-rise .5s .9s ease-out both',
          }}>
            <div style={{ position: 'relative' }}>
              <Ring percent={goalPct} size={44} stroke={4} color={C_BLUE} track="rgba(122,167,255,.10)" delay={1000}/>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: C_BLUE, fontWeight: 700, ...MONO_STYLE, letterSpacing: '-.02em' }}>53%</div>
            </div>
            <span style={{ fontSize: 8, color: KAI.text3, fontWeight: 700, letterSpacing: '.06em' }}>旅行貯金</span>
          </div>
        </div>

        {/* Today snapshot + recent transactions */}
        <div style={S_RECENT_WRAP}>
          <div style={S_RECENT_HDR}>
            <div style={S_RECENT_HDR_L}>
              <span style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>今日</span>
              <span style={{ fontSize: 16, fontWeight: 700, ...MONO_STYLE, color: KAI.text1, letterSpacing: '-.02em' }}>{yen(todayTotal)}</span>
              <span style={{ fontSize: 10, color: KAI.text4 }}>· 3件</span>
            </div>
            <span style={{ fontSize: 10, color: C_CORAL, fontWeight: 600 }}>詳細 ›</span>
          </div>
          <div style={S_RECENT_ROWS}>
            {C_RECENT.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, animation: `kai-rise .35s ${.35 + i * .05}s ease-out both` }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: `${t.color}1c`, border: `1px solid ${t.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color,
                }}>
                  <Icon name={t.icon} size={11} stroke={2}/>
                </div>
                <span style={{ flex: 1, fontSize: 11.5, color: KAI.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
                <span style={{ fontSize: 9, color: KAI.text4, ...MONO_STYLE }}>{t.time}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em', minWidth: 42, textAlign: 'right' }}>¥{t.amount.toLocaleString('ja-JP')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category chips 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .6s .35s ease-out both' }}>
          {C_CATEGORIES.map((c, i) => (
            <CategoryChip key={c.name} {...c} idx={i}/>
          ))}
        </div>

        {/* Upcoming bills */}
        <div style={{ animation: 'kai-rise .6s .45s ease-out both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: KAI.text4, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>今後の予定</span>
            <span style={{ fontSize: 10, color: KAI.text3, ...MONO_STYLE }}>30日内 ¥{C_UPCOMING.reduce((s, u) => s + u.amount, 0).toLocaleString('ja-JP')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {C_UPCOMING.map((u, i) => (
              <div key={i} style={{
                flexShrink: 0, padding: '7px 10px',
                background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
                animation: `kai-rise .35s ${.5 + i * .04}s ease-out both`,
              }}>
                <span style={{ width: 4, height: 24, borderRadius: 99, background: u.color }}/>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{ fontSize: 10, color: KAI.text3, ...MONO_STYLE }}>{u.date}</span>
                    <span style={{ fontSize: 11, color: KAI.text1, fontWeight: 600 }}>{u.label}</span>
                  </div>
                  <div style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE, marginTop: 1 }}>¥{u.amount.toLocaleString('ja-JP')} · あと{u.days}日</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI inline insight */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(251,148,119,.10), rgba(122,167,255,.06))',
          border: '1px solid rgba(251,148,119,.18)',
          borderRadius: 12, padding: '9px 12px',
          display: 'flex', alignItems: 'center', gap: 9,
          animation: 'kai-rise .6s .58s ease-out both', cursor: 'pointer',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C_CORAL}, ${C_PEACH})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_PEACH,
          }}><Sparkles size={13} strokeWidth={1.8}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: KAI.textBody, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              今週は外食 +32%、でも全体ペースは順調 <span style={{ color: C_CORAL, fontWeight: 700 }}>· AIに訳を聞く</span>
            </div>
          </div>
          <span style={{ color: C_CORAL, fontSize: 14 }}>›</span>
        </div>
      </div>

      <BottomBar active={activeTab} accent={C_CORAL} variant="fab" onAdd={onAddClick} onNav={onNavClick}/>
    </PhoneShell>
  );
}
