'use client';

import { Sparkles } from 'lucide-react';
import { KAI } from '@/lib/kai-tokens';
import {
  useCountUp, Icon, KaiSystemBrand, CAvatar,
  PhoneShell, DesktopShell, KaiSidebar, BottomBar, yen, MONO_STYLE,
} from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;
const C_CORAL_SOFT = KAI.coralSoft;

const B_CATEGORIES = [
  { name: '食費',   icon: 'cart',   color: C_CORAL,   used: 48200, budget: 60000 },
  { name: 'カフェ', icon: 'coffee', color: C_PEACH,   used: 6400,  budget: 10000 },
  { name: '交通',   icon: 'train',  color: C_BLUE,    used: 18400, budget: 25000 },
  { name: '娯楽',   icon: 'bag',    color: KAI.tangerine, used: 32100, budget: 30000 },
  { name: '固定費', icon: 'home',   color: '#a78bfa', used: 44150, budget: 45000 },
  { name: '日用品', icon: 'cart',   color: '#5eead4', used: 4600,  budget: 15000 },
  { name: 'その他', icon: 'tag',    color: '#7aa7ff', used: 4000,  budget: 15000 },
];

function budgetStatus(used: number, budget: number) {
  const pct = used / budget;
  if (pct > 1)   return { label: '超過',   tone: '#fb7185' };
  if (pct > 0.9) return { label: '要注意', tone: '#fbbf24' };
  if (pct > 0.5) return { label: '順調',   tone: '#4ade80' };
  return { label: '余裕', tone: '#4ade80' };
}

function BudgetRow({ cat, idx, big = false }: {
  cat: typeof B_CATEGORIES[0]; idx: number; big?: boolean;
}) {
  const pct = Math.min(100, (cat.used / cat.budget) * 100);
  const animatedPct = useCountUp(pct, { duration: 1200, delay: 350 + idx * 60 });
  const status = budgetStatus(cat.used, cat.budget);
  const over = cat.used > cat.budget;
  return (
    <div style={{ padding: big ? '12px 14px' : '10px 12px', animation: `kai-rise .4s ${.25 + idx * .04}s ease-out both` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{
          width: big ? 30 : 26, height: big ? 30 : 26, borderRadius: big ? 9 : 8, flexShrink: 0,
          background: `${cat.color}1c`, border: `1px solid ${cat.color}33`, color: cat.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={cat.icon} size={big ? 14 : 12} stroke={2}/>
        </div>
        <span style={{ fontSize: big ? 14 : 12.5, color: KAI.text1, fontWeight: 600 }}>{cat.name}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, ...MONO_STYLE, letterSpacing: '.08em',
          color: status.tone, background: `${status.tone}15`, border: `1px solid ${status.tone}33`,
          borderRadius: 5, padding: '1px 5px',
        }}>{status.label}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: big ? 14 : 13, fontWeight: 700, color: over ? '#fb7185' : KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>
            ¥{cat.used.toLocaleString('ja-JP')}
          </span>
          <span style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE }}>
            / ¥{cat.budget.toLocaleString('ja-JP')}
          </span>
        </span>
      </div>
      <div style={{ height: big ? 6 : 5, borderRadius: 99, background: 'rgba(255,255,255,.05)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, animatedPct)}%`,
          background: over ? '#fb7185' : `linear-gradient(90deg, ${cat.color}, ${cat.color}88)`,
          borderRadius: 99,
        }}/>
        <div style={{ position: 'absolute', top: -2, bottom: -2, left: '52%', width: 1.5, background: 'rgba(255,255,255,.35)', borderRadius: 1 }}/>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9.5, color: KAI.text4, ...MONO_STYLE }}>
          {Math.round(pct)}% 消化 · 残り ¥{Math.max(0, cat.budget - cat.used).toLocaleString('ja-JP')}
        </span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: status.tone }}/>

      </div>
    </div>
  );
}

function BudgetDonut({ items, size = 180, stroke = 22 }: {
  items: typeof B_CATEGORIES; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = items.reduce((s, i) => s + i.budget, 0);
  let cumPct = 0;
  return (
    <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.04)" strokeWidth={stroke} fill="none"/>
      {items.map((it, i) => {
        const pct = it.budget / total;
        const len = C * pct;
        const dash = `${len * 0.94} ${C - len * 0.94}`;
        const offset = -C * cumPct;
        cumPct += pct;
        return (
          <circle key={it.name}
            cx={size / 2} cy={size / 2} r={r}
            stroke={it.color} strokeWidth={stroke} fill="none"
            strokeDasharray={dash} strokeDashoffset={offset}
            style={{ animation: `kai-rise .6s ${0.3 + i * 0.05}s ease-out both`, transformOrigin: 'center' }}
          />
        );
      })}
    </svg>
  );
}

interface BudgetScreenProps {
  onNavClick?: (id: string) => void;
  onAddClick?: () => void;
}

export function BudgetScreenMobile({ onNavClick, onAddClick }: BudgetScreenProps) {
  const total = useCountUp(157850, { duration: 1500 });
  const totalBudget = 200000;
  const totalUsed = 157850;
  const pacePct = (16 / 31) * 100;

  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <KaiSystemBrand size="sm"/>
        <CAvatar size={32}/>
      </header>

      <div style={{ flex: 1, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>予算</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {['週', '月', '年'].map((p, i) => (
              <span key={p} style={{
                fontSize: 10, color: i === 1 ? C_CORAL : KAI.text4, fontWeight: 700,
                background: i === 1 ? 'rgba(251,148,119,.10)' : 'rgba(255,255,255,.03)',
                border: i === 1 ? '1px solid rgba(251,148,119,.25)' : '1px solid rgba(255,255,255,.06)',
                borderRadius: 99, padding: '4px 12px', cursor: 'pointer',
              }}>{p}</span>
            ))}
          </div>
        </div>

        {/* Hero: total budget progress */}
        <div style={{
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 18, padding: '14px 16px', animation: 'kai-rise .5s ease-out both',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>2026年5月</span>
            <span style={{
              fontSize: 9, fontWeight: 700, ...MONO_STYLE, letterSpacing: '.08em',
              color: '#4ade80', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.22)',
              borderRadius: 5, padding: '2px 6px',
            }}>順調 · -¥4,800 PACE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ ...MONO_STYLE, fontSize: 30, fontWeight: 800, color: KAI.text1, letterSpacing: '-.03em' }}>{yen(total)}</span>
            <span style={{ fontSize: 13, color: KAI.text4, ...MONO_STYLE }}>/ ¥{totalBudget.toLocaleString('ja-JP')}</span>
          </div>
          {/* Stacked progress bar */}
          <div style={{ marginTop: 10, height: 10, borderRadius: 99, background: 'rgba(255,255,255,.04)', overflow: 'hidden', display: 'flex', position: 'relative' }}>
            {B_CATEGORIES.map((c, i) => {
              const w = (Math.min(c.used, c.budget) / totalBudget) * 100;
              return (
                <div key={c.name} style={{
                  width: `${w}%`, height: '100%', background: c.color,
                  borderRight: i < B_CATEGORIES.length - 1 ? '1px solid rgba(12,10,20,.6)' : '0',
                  animation: `kai-bar-grow-x .8s ${.3 + i * .05}s cubic-bezier(.2,.8,.3,1) both`,
                  transformOrigin: 'left',
                }}/>
              );
            })}
            <div style={{
              position: 'absolute', top: -3, bottom: -3, left: `${pacePct}%`, width: 2,
              background: 'rgba(255,255,255,.55)', borderRadius: 1,
              boxShadow: '0 0 6px rgba(255,255,255,.4)',
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 10, color: C_CORAL, fontWeight: 600 }}>79% 消化 · 残り ¥{(totalBudget - totalUsed).toLocaleString('ja-JP')}</span>
            <span style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE }}>day 16/31 · 残 15日</span>
          </div>
        </div>

        {/* Forecast strip */}
        <div style={{
          background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.18)',
          borderRadius: 14, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 11,
          animation: 'kai-rise .5s .1s ease-out both',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.28)',
            color: '#4ade80',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon name="arrowDown" size={14} stroke={2.4}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 11, color: KAI.text3, fontWeight: 600 }}>月末予測</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', ...MONO_STYLE, letterSpacing: '-.01em' }}>¥195,200</span>
              <span style={{ fontSize: 10, color: '#4ade80' }}>-¥4,800 安全圏</span>
            </div>
            <div style={{ fontSize: 10, color: KAI.text4, marginTop: 2 }}>このペースなら 予算 ¥200,000 内で着地</div>
          </div>
        </div>

        {/* Category list */}
        <div style={{ animation: 'kai-rise .5s .18s ease-out both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>カテゴリ別</span>
            <span style={{ fontSize: 10, color: C_CORAL, fontWeight: 600, cursor: 'pointer' }}>編集 ›</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, overflow: 'hidden' }}>
            {B_CATEGORIES.map((c, i) => (
              <div key={c.name} style={{ borderBottom: i < B_CATEGORIES.length - 1 ? '1px solid rgba(255,255,255,.04)' : '0' }}>
                <BudgetRow cat={c} idx={i}/>
              </div>
            ))}
          </div>
        </div>

        {/* AI suggestion */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(251,148,119,.04))',
          border: '1px solid rgba(167,139,250,.18)',
          borderRadius: 14, padding: '11px 12px',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          animation: 'kai-rise .5s .28s ease-out both', marginBottom: 14,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C_CORAL}, ${C_PEACH})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_PEACH,
          }}><Sparkles size={14} strokeWidth={1.8}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>提案</div>
            <div style={{ fontSize: 12, color: KAI.textBody, marginTop: 3, lineHeight: 1.55 }}>
              <span style={{ color: KAI.tangerine, fontWeight: 700 }}>娯楽</span> が <span style={{ color: '#fb7185', fontWeight: 700 }}>+¥2,100 超過</span>。 来月は <span style={{ color: C_CORAL, fontWeight: 700 }}>¥35,000</span> に調整するのがおすすめ。
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ fontSize: 11, color: KAI.bg, fontWeight: 700, background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`, border: 'none', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>適用する</button>
              <button style={{ fontSize: 11, color: KAI.text2, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>後で</button>
            </div>
          </div>
        </div>
      </div>

      <BottomBar active="budget" accent={C_CORAL} variant="fab" onAdd={onAddClick} onNav={onNavClick}/>
    </PhoneShell>
  );
}

export function BudgetScreenDesktop({ onNavClick }: BudgetScreenProps) {
  const total = useCountUp(157850, { duration: 1700 });
  const totalBudget = 200000;
  const pacePct = (16 / 31) * 100;

  return (
    <DesktopShell width={1100} height={680} glow="warm" bg={KAI.bgCard}>
      <KaiSidebar active="budget" accent={C_CORAL} accentSoft={C_CORAL_SOFT} brand={<KaiSystemBrand size="md"/>} onNav={onNavClick}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>予算</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['週', '月', '年', 'カスタム'].map((p, i) => (
                <span key={p} style={{
                  fontSize: 11, color: i === 1 ? C_CORAL : KAI.text4, fontWeight: 700,
                  background: i === 1 ? 'rgba(251,148,119,.10)' : 'rgba(255,255,255,.03)',
                  border: i === 1 ? '1px solid rgba(251,148,119,.25)' : '1px solid rgba(255,255,255,.06)',
                  borderRadius: 99, padding: '4px 12px', cursor: 'pointer',
                }}>{p}</span>
              ))}
            </div>
            <span style={{ fontSize: 11, color: KAI.text4, ...MONO_STYLE, letterSpacing: '.08em', marginLeft: 6 }}>· 2026.05.01 – 05.31</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={{
              fontSize: 12, color: C_CORAL, fontWeight: 600,
              background: 'rgba(251,148,119,.08)', border: '1px solid rgba(251,148,119,.22)',
              borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Icon name="settings" size={13} stroke={2}/> 予算を編集
            </button>
            <CAvatar size={36}/>
          </div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 0, overflow: 'hidden' }}>
          {/* LEFT: donut + key stats + suggestion */}
          <div style={{ padding: '22px 26px', borderRight: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
            <div style={{
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 20, padding: '20px', display: 'flex', alignItems: 'center', gap: 18,
              animation: 'kai-rise .5s ease-out both',
            }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <BudgetDonut items={B_CATEGORIES} size={180} stroke={22}/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>消化</div>
                  <div style={{ ...MONO_STYLE, fontWeight: 800, fontSize: 30, color: KAI.text1, letterSpacing: '-.03em', marginTop: 2 }}>79<span style={{ fontSize: 14, color: KAI.text3 }}>%</span></div>
                  <div style={{ fontSize: 11, color: C_CORAL, fontWeight: 600, marginTop: 2 }}>{yen(total)}</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: KAI.text3, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>5月 予算</div>
                <div style={{ ...MONO_STYLE, fontSize: 30, fontWeight: 800, color: KAI.text1, letterSpacing: '-.03em', marginTop: 4 }}>¥{totalBudget.toLocaleString('ja-JP')}</div>
                <div style={{ fontSize: 12, color: KAI.text3, marginTop: 4 }}>残り <span style={{ color: '#4ade80', ...MONO_STYLE, fontWeight: 700 }}>¥{(totalBudget - 157850).toLocaleString('ja-JP')}</span> · day 16/31</div>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, ...MONO_STYLE, letterSpacing: '.08em', color: '#4ade80', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.22)', borderRadius: 6, padding: '3px 8px' }}>
                  ● 順調ペース · -¥4,800
                </div>
              </div>
            </div>

            {/* Pace forecast bar */}
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, padding: '16px 18px', animation: 'kai-rise .5s .12s ease-out both' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: KAI.text2, fontWeight: 600 }}>月末予測</span>
                <span style={{ fontSize: 10, color: KAI.text4, ...MONO_STYLE }}>day 16 → 31</span>
              </div>
              <div style={{ position: 'relative', height: 54 }}>
                <div style={{ position: 'absolute', inset: '24px 0 0 0', height: 8, borderRadius: 99, background: 'rgba(255,255,255,.04)' }}/>
                <div style={{ position: 'absolute', top: 24, left: 0, height: 8, borderRadius: 99, width: '79%', background: `linear-gradient(90deg, ${C_CORAL}, ${C_PEACH})`, animation: 'kai-bar-grow-x .8s .3s ease-out both', transformOrigin: 'left' }}/>
                <div style={{ position: 'absolute', top: 24, left: '79%', height: 8, borderRadius: 99, width: '18%', background: `repeating-linear-gradient(45deg, ${C_CORAL}55 0 4px, transparent 4px 8px)`, border: `1px dashed ${C_CORAL}66`, animation: 'kai-bar-grow-x .8s .7s ease-out both', transformOrigin: 'left' }}/>
                <div style={{ position: 'absolute', top: 0, left: '79%', transform: 'translateX(-50%)', fontSize: 10, ...MONO_STYLE, color: KAI.text1, fontWeight: 700, whiteSpace: 'nowrap' }}>今日 ¥157.8k</div>
                <div style={{ position: 'absolute', top: 38, left: '97%', transform: 'translateX(-100%)', fontSize: 10, ...MONO_STYLE, color: '#4ade80', fontWeight: 700, whiteSpace: 'nowrap' }}>月末 ¥195.2k</div>
                <div style={{ position: 'absolute', top: 18, bottom: 14, right: 0, width: 2, background: 'rgba(255,255,255,.45)', borderRadius: 1, boxShadow: '0 0 6px rgba(255,255,255,.4)' }}/>
                <div style={{ position: 'absolute', top: 0, right: 0, fontSize: 10, ...MONO_STYLE, color: KAI.text3, fontWeight: 600 }}>¥200k</div>
              </div>
            </div>

            {/* AI suggestion */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(251,148,119,.04))',
              border: '1px solid rgba(167,139,250,.18)',
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12,
              animation: 'kai-rise .5s .24s ease-out both', marginTop: 'auto',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${C_CORAL}, ${C_PEACH})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Sparkles size={16} strokeWidth={1.8}/></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>kai からの提案</div>
                <div style={{ fontSize: 13, color: KAI.textBody, marginTop: 4, lineHeight: 1.6 }}>
                  <span style={{ color: KAI.tangerine, fontWeight: 700 }}>娯楽</span> が <span style={{ color: '#fb7185', fontWeight: 700 }}>+¥2,100 超過</span>。来月は <span style={{ color: C_CORAL, fontWeight: 700 }}>¥35,000</span> に上げ、浮いた <span style={{ color: C_BLUE, fontWeight: 700 }}>日用品</span> を <span style={{ color: C_CORAL, fontWeight: 700 }}>¥10,000</span> に下げるのが◎
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={{ fontSize: 12, color: KAI.bg, fontWeight: 700, background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`, border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 12px ${C_CORAL}33` }}>来月から適用</button>
                  <button style={{ fontSize: 12, color: KAI.text2, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>後で考える</button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: category list */}
          <div style={{ padding: '22px 28px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 11, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, textTransform: 'uppercase' }}>カテゴリ別 予算</span>
              <span style={{ fontSize: 11, color: KAI.text3, ...MONO_STYLE, letterSpacing: '.04em' }}>{B_CATEGORIES.length} カテゴリ</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
              {B_CATEGORIES.map((c, i) => (
                <div key={c.name} style={{ borderBottom: i < B_CATEGORIES.length - 1 ? '1px solid rgba(255,255,255,.04)' : '0' }}>
                  <BudgetRow cat={c} idx={i} big/>
                </div>
              ))}
            </div>
            <button style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px',
              background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.18)',
              borderRadius: 12, color: KAI.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="plus" size={13} stroke={2}/> カテゴリを追加
            </button>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
