'use client';

import { KAI } from '@/lib/kai-tokens';
import {
  useCountUp, useTypewriter, Icon, KaiSystemBrand, CAvatar,
  DesktopShell, KaiSidebar, Ring, BarChart, yen, BlinkCaret, MONO_STYLE,
} from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;
const C_CORAL_SOFT = KAI.coralSoft;

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

const C_DAYS = [
  { d: '月', v: 22, mood: '🙂' },
  { d: '火', v: 14, mood: '🙂' },
  { d: '水', v: 36, mood: '😐' },
  { d: '木', v: 11, mood: '😊' },
  { d: '金', v: 52, mood: '😬' },
  { d: '土', v: 41, mood: '😐' },
  { d: '日', v: 28, mood: '🙂' },
];

const C_GOAL = { name: '京都旅行', target: 150000, current: 80000 };

function CategoryChip({ name, value, budget, color, icon, idx }: {
  name: string; value: number; budget: number; color: string; icon: string; idx: number;
}) {
  const pct = Math.min(100, (value / budget) * 100);
  const over = value > budget;
  const animatedPct = useCountUp(pct, { duration: 1200, delay: 400 + idx * 80 });
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
      borderRadius: 14, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
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
      <div style={{ marginTop: 6, height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, animatedPct)}%`, background: over ? KAI.red : color, borderRadius: 99 }}/>
      </div>
      <div style={{ fontSize: 9, color: KAI.text4, marginTop: 3, ...MONO_STYLE }}>
        / ¥{budget.toLocaleString('ja-JP')}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'ok' }: { label: string; value: string; tone?: 'ok' | 'warn' }) {
  const color = tone === 'warn' ? C_CORAL : '#4ade80';
  return (
    <div style={{
      background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '6px 10px',
      display: 'flex', flexDirection: 'column', gap: 1,
    }}>
      <span style={{ fontSize: 9, color: KAI.text3, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color, ...MONO_STYLE }}>{value}</span>
    </div>
  );
}

interface DashboardDesktopProps {
  firstName?: string;
  streak?: number;
  totalSpend?: number;
  todaySpend?: number;
  onAddClick?: () => void;
  onNavClick?: (id: string) => void;
  activeTab?: string;
}

export function DashboardDesktop({
  firstName = 'あゆ',
  streak = 8,
  totalSpend,
  todaySpend,
  onAddClick,
  onNavClick,
  activeTab = 'dashboard',
}: DashboardDesktopProps) {
  const total = useCountUp(totalSpend ?? 142850, { duration: 1700 });
  const todayTotal = useCountUp(todaySpend ?? 4100, { duration: 1200, delay: 700 });
  const goalCur = useCountUp(80000, { duration: 1400, delay: 800 });
  const goalPct = (C_GOAL.current / C_GOAL.target) * 100;
  const aiTease = useTypewriter('今週は外食 +32%、でもペースは順調。週末のカフェを ¥1,500 抑えれば予算内だよ！', { speed: 22, delay: 1300 });

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは';

  return (
    <DesktopShell width={1100} height={680} glow="warm" bg={KAI.bgCard}>
      <KaiSidebar active={activeTab} accent={C_CORAL} accentSoft={C_CORAL_SOFT} brand={<KaiSystemBrand size="md"/>} onNav={onNavClick}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          <div>
            <div style={{ fontSize: 12, color: KAI.text3 }}>{greeting}、</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: KAI.text1, marginTop: 1 }}>
              {firstName}さん 👋  <span style={{ fontSize: 13, color: KAI.text3, fontWeight: 400 }}>今日は{now.getMonth() + 1}月{now.getDate()}日</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {streak > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(251,148,119,.12)', border: '1px solid rgba(251,148,119,.28)',
                borderRadius: 99, padding: '5px 12px', fontSize: 12, color: C_CORAL, fontWeight: 700,
              }}>
                🔥 <span style={{ ...MONO_STYLE }}>{streak}日連続記録</span>
              </span>
            )}
            <button onClick={onAddClick} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`,
              border: 'none', borderRadius: 99, padding: '8px 16px',
              fontSize: 12, color: KAI.bg, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 6px 20px ${C_CORAL}33`,
            }}>
              <Icon name="plus" size={14} stroke={2.4}/> 追加
            </button>
            <CAvatar size={36} initial={firstName.charAt(0)}/>
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 30px', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* LEFT col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Ring hero */}
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 24, padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 20,
              animation: 'kai-rise .8s ease-out both',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Ring percent={71} size={170} stroke={12} color={C_CORAL} delay={300}/>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, ...MONO_STYLE, color: KAI.text1, letterSpacing: '-.02em' }}>
                    71<span style={{ fontSize: 14, color: KAI.text3 }}>%</span>
                  </div>
                  <div style={{ fontSize: 10, color: KAI.text3, marginTop: 2 }}>budget used</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: KAI.text3, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>今月の支出</div>
                <div style={{ ...MONO_STYLE, fontSize: 36, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 4 }}>{yen(total)}</div>
                <div style={{ fontSize: 12, color: C_CORAL, fontWeight: 600, marginTop: 6 }}>残り ¥57,150 · 22 日</div>
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  <Stat label="前月" value="+¥8,200" tone="warn"/>
                  <Stat label="スコア" value="82 pt" tone="ok"/>
                </div>
              </div>
            </div>

            {/* Week mood strip */}
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 18, padding: '14px 18px',
              animation: 'kai-rise .6s .3s ease-out both',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: KAI.text2, fontWeight: 600 }}>今週のペース</span>
                <span style={{ fontSize: 11, color: KAI.text4 }}>機嫌で見る曜日</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                {C_DAYS.map((d, i) => (
                  <div key={d.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{d.mood}</div>
                    <div style={{
                      width: '100%', height: 60, borderRadius: 8,
                      background: 'rgba(255,255,255,.04)',
                      display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '100%', height: `${d.v}%`,
                        background: `linear-gradient(180deg, ${i === 4 ? '#fb7185' : C_CORAL}, ${i === 4 ? '#fb7185' : C_CORAL}88)`,
                        transformOrigin: 'bottom',
                        animation: `kai-bar-grow .8s ${.4 + i * .05}s cubic-bezier(.2,.8,.3,1) both`,
                      }}/>
                    </div>
                    <div style={{ fontSize: 10, color: i === 4 ? '#fb7185' : KAI.text3, fontWeight: i === 4 ? 700 : 500 }}>{d.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .6s .45s ease-out both' }}>
              {C_CATEGORIES.map((c, i) => <CategoryChip key={c.name} {...c} idx={i}/>)}
            </div>
          </div>

          {/* RIGHT col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Today snapshot + recent */}
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 18, padding: '16px 18px', animation: 'kai-rise .6s .2s ease-out both',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>今日</span>
                  <span style={{ fontSize: 22, fontWeight: 700, ...MONO_STYLE, color: KAI.text1, letterSpacing: '-.02em' }}>{yen(todayTotal)}</span>
                  <span style={{ fontSize: 11, color: KAI.text4 }}>3件</span>
                </div>
                <span style={{ fontSize: 11, color: C_CORAL, fontWeight: 600, cursor: 'pointer' }}>すべて見る ›</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {C_RECENT.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `kai-rise .35s ${.3 + i * .05}s ease-out both` }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                      background: `${t.color}1c`, border: `1px solid ${t.color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color,
                    }}>
                      <Icon name={t.icon} size={13} stroke={2}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: KAI.text1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: KAI.text3, ...MONO_STYLE }}>{t.time}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>¥{t.amount.toLocaleString('ja-JP')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming bills */}
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 18, padding: '16px 18px', animation: 'kai-rise .6s .3s ease-out both',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>今後30日の予定</span>
                <span style={{ fontSize: 11, ...MONO_STYLE, color: C_CORAL, fontWeight: 700 }}>¥{C_UPCOMING.reduce((s, u) => s + u.amount, 0).toLocaleString('ja-JP')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {C_UPCOMING.map((u, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `kai-rise .35s ${.4 + i * .04}s ease-out both` }}>
                    <div style={{ width: 6, height: 30, borderRadius: 99, background: u.color, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: KAI.text1, fontWeight: 500 }}>{u.label}</div>
                      <div style={{ fontSize: 10, color: KAI.text3, ...MONO_STYLE }}>{u.date} · あと {u.days} 日</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>¥{u.amount.toLocaleString('ja-JP')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saving goal mini */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(122,167,255,.07), rgba(94,234,212,.04))',
              border: '1px solid rgba(122,167,255,.18)',
              borderRadius: 18, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'kai-rise .6s .4s ease-out both',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Ring percent={goalPct} size={68} stroke={6} color={C_BLUE} track="rgba(122,167,255,.10)" delay={800}/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: C_BLUE, fontWeight: 700, ...MONO_STYLE }}>53%</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1 }}>{C_GOAL.name}</span>
                  <span style={{ fontSize: 9, ...MONO_STYLE, color: C_BLUE, fontWeight: 700, letterSpacing: '.1em', background: 'rgba(122,167,255,.1)', border: '1px solid rgba(122,167,255,.22)', borderRadius: 5, padding: '1px 6px' }}>GOAL</span>
                </div>
                <div style={{ ...MONO_STYLE, fontSize: 18, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 4 }}>
                  ¥{Math.round(goalCur).toLocaleString('ja-JP')}<span style={{ color: KAI.text4, fontSize: 12 }}> / ¥{C_GOAL.target.toLocaleString('ja-JP')}</span>
                </div>
                <div style={{ fontSize: 10, color: KAI.text3, marginTop: 3 }}>あと ¥{(C_GOAL.target - C_GOAL.current).toLocaleString('ja-JP')} · 4ヶ月ペース</div>
              </div>
            </div>

            {/* AI tease */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(251,148,119,.10), rgba(167,139,250,.06))',
              border: '1px solid rgba(251,148,119,.18)',
              borderRadius: 14, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 11,
              animation: 'kai-rise .6s .5s ease-out both', cursor: 'pointer',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${C_CORAL}, ${C_PEACH})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>✨</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>AI サマリー</div>
                <div style={{ fontSize: 12.5, color: KAI.textBody, marginTop: 2, lineHeight: 1.5 }}>
                  {aiTease.shown}
                  {!aiTease.done && <BlinkCaret color={C_CORAL}/>}
                </div>
              </div>
              <span style={{ color: C_CORAL, fontSize: 16, fontWeight: 700 }}>›</span>
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
