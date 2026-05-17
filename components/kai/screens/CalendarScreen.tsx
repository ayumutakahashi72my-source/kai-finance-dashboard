'use client';

import { useState } from 'react';
import { KAI } from '@/lib/kai-tokens';
import {
  Icon, KaiSystemBrand, CAvatar,
  PhoneShell, DesktopShell, KaiSidebar, BottomBar, MONO_STYLE,
} from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;
const C_CORAL_SOFT = KAI.coralSoft;

// May 2026 — May 1 = Fri → offset 5
const CAL_DAYS_MAY: (number | null)[] = [];
for (let i = 0; i < 5; i++) CAL_DAYS_MAY.push(null);
for (let i = 1; i <= 31; i++) CAL_DAYS_MAY.push(i);

const CAL_SPEND: Record<number, number> = {
  1: 1200, 2: 0, 3: 5800, 4: 3200, 5: 1100, 6: 12400, 7: 4500, 8: 800,
  9: 2200, 10: 3100, 11: 6700, 12: 1800, 13: 9200, 14: 4400, 15: 2800,
  16: 5100, 17: 7200, 18: 3400, 19: 2100, 20: 11800, 21: 4600, 22: 1900,
  23: 3300, 24: 2700, 25: 8400, 26: 5800, 27: 2200, 28: 4100, 29: 0, 30: 6300, 31: 2400,
};

function spendBg(v: number) {
  if (!v) return 'transparent';
  const i = v < 2000 ? 1 : v < 5000 ? 2 : v < 9000 ? 3 : 4;
  const op = [0, 0.10, 0.22, 0.44, 0.70][i];
  return `rgba(251,148,119,${op})`;
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12 }}>
      <div style={{ fontSize: 9, color: KAI.text3, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, ...MONO_STYLE, color: tone, letterSpacing: '-.02em', marginTop: 3 }}>{value}</div>
    </div>
  );
}

const TX_DAY = [
  { icon: 'cart',   label: 'スーパー 成城石井', cat: '食費',   amount: -3420, color: C_CORAL, time: '19:42' },
  { icon: 'coffee', label: 'Blue Bottle',       cat: 'カフェ', amount: -680,  color: C_PEACH, time: '11:08' },
  { icon: 'train',  label: 'JR東日本 IC',       cat: '交通',   amount: -1000, color: C_BLUE,  time: '09:24' },
];

interface CalendarScreenProps {
  onNavClick?: (id: string) => void;
  onAddClick?: () => void;
}

export function CalendarScreenMobile({ onNavClick, onAddClick }: CalendarScreenProps) {
  const [selected, setSelected] = useState(16);

  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <KaiSystemBrand size="sm"/>
        <CAvatar size={32}/>
      </header>

      <div style={{ flex: 1, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>カレンダー</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', width: 28, height: 28, borderRadius: 8, color: KAI.text2, cursor: 'pointer' }}>‹</button>
            <span style={{ fontSize: 13, color: KAI.text1, fontWeight: 600, ...MONO_STYLE, letterSpacing: '.04em' }}>2026年5月</span>
            <button style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', width: 28, height: 28, borderRadius: 8, color: KAI.text2, cursor: 'pointer' }}>›</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, animation: 'kai-rise .5s ease-out both' }}>
          <SummaryChip label="今月合計" value="¥142,850" tone={C_CORAL}/>
          <SummaryChip label="日平均" value="¥4,608" tone={C_BLUE}/>
        </div>

        {/* Week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 4 }}>
          {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, color: i === 0 ? '#fb7185' : i === 6 ? C_BLUE : KAI.text4, fontWeight: 700, letterSpacing: '.06em' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, animation: 'kai-rise .5s .1s ease-out both' }}>
          {CAL_DAYS_MAY.map((d, i) => {
            if (d === null) return <div key={`pad-${i}`} style={{ aspectRatio: '1/1' }}/>;
            const sp = CAL_SPEND[d] || 0;
            const isSelected = d === selected;
            const dow = i % 7;
            return (
              <button key={d} onClick={() => setSelected(d)} style={{
                aspectRatio: '1/1', borderRadius: 9, padding: 0,
                background: isSelected ? `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})` : 'rgba(255,255,255,.02)',
                border: isSelected ? '0' : '1px solid rgba(255,255,255,.06)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isSelected ? 'transparent' : spendBg(sp),
                }}/>
                <span style={{
                  position: 'relative', fontSize: 13, fontWeight: isSelected ? 800 : 600,
                  ...MONO_STYLE,
                  color: isSelected ? KAI.bg : (dow === 0 ? '#fb7185' : dow === 6 ? C_BLUE : KAI.text1),
                }}>{d}</span>
                {sp > 0 && (
                  <span style={{
                    position: 'relative', fontSize: 8,
                    color: isSelected ? 'rgba(10,10,16,.7)' : KAI.text3,
                    ...MONO_STYLE, fontWeight: 600, letterSpacing: '-.02em',
                  }}>
                    {sp >= 1000 ? `${(sp / 1000).toFixed(sp >= 10000 ? 0 : 1)}k` : sp}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail */}
        <div style={{
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 14, padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
          animation: 'kai-rise .5s .2s ease-out both',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1 }}>5月{selected}日</span>
              <span style={{ fontSize: 10, color: KAI.text3, marginLeft: 6 }}>土曜日 · 3件</span>
            </div>
            <span style={{ ...MONO_STYLE, fontSize: 14, fontWeight: 700, color: C_CORAL, letterSpacing: '-.02em' }}>
              ¥{(CAL_SPEND[selected] || 0).toLocaleString('ja-JP')}
            </span>
          </div>
          {TX_DAY.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, animation: `kai-rise .4s ${.3 + i * .06}s ease-out both` }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: `${t.color}1c`, border: `1px solid ${t.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color,
              }}>
                <Icon name={t.icon} size={14} stroke={2}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: KAI.text1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</div>
                <div style={{ fontSize: 10, color: KAI.text3 }}>{t.cat}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>
                ¥{Math.abs(t.amount).toLocaleString('ja-JP')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomBar active="calendar" accent={C_CORAL} variant="fab" onAdd={onAddClick} onNav={onNavClick}/>
    </PhoneShell>
  );
}

export function CalendarScreenDesktop({ onNavClick }: CalendarScreenProps) {
  const [selected, setSelected] = useState(16);

  return (
    <DesktopShell width={1100} height={680} glow="warm" bg={KAI.bgCard}>
      <KaiSidebar active="calendar" accent={C_CORAL} accentSoft={C_CORAL_SOFT} brand={<KaiSystemBrand size="md"/>} onNav={onNavClick}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>カレンダー</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', width: 28, height: 28, borderRadius: 8, color: KAI.text2, cursor: 'pointer' }}>‹</button>
              <span style={{ fontSize: 13, color: KAI.text1, fontWeight: 600, ...MONO_STYLE, letterSpacing: '.04em' }}>2026年5月</span>
              <button style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', width: 28, height: 28, borderRadius: 8, color: KAI.text2, cursor: 'pointer' }}>›</button>
            </div>
          </div>
          <CAvatar size={36}/>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 0, overflow: 'hidden' }}>
          {/* Calendar */}
          <div style={{ padding: '22px 26px', overflow: 'auto', borderRight: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <SummaryChip label="今月合計" value="¥142,850" tone={C_CORAL}/>
              <SummaryChip label="日平均" value="¥4,608" tone={C_BLUE}/>
              <SummaryChip label="ピーク" value="¥12,400" tone={C_PEACH}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, color: i === 0 ? '#fb7185' : i === 6 ? C_BLUE : KAI.text4, fontWeight: 700, letterSpacing: '.06em', padding: '4px 0' }}>{d}</div>
              ))}
              {CAL_DAYS_MAY.map((d, i) => {
                if (d === null) return <div key={`pad-${i}`} style={{ aspectRatio: '1/1' }}/>;
                const sp = CAL_SPEND[d] || 0;
                const isSelected = d === selected;
                const dow = i % 7;
                return (
                  <button key={d} onClick={() => setSelected(d)} style={{
                    aspectRatio: '1.1/1', borderRadius: 10, padding: 0,
                    background: isSelected ? `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})` : 'rgba(255,255,255,.02)',
                    border: isSelected ? '0' : '1px solid rgba(255,255,255,.06)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: isSelected ? 'transparent' : spendBg(sp) }}/>
                    <span style={{ position: 'relative', fontSize: 15, fontWeight: isSelected ? 800 : 600, ...MONO_STYLE, color: isSelected ? KAI.bg : (dow === 0 ? '#fb7185' : dow === 6 ? C_BLUE : KAI.text1) }}>{d}</span>
                    {sp > 0 && (
                      <span style={{ position: 'relative', fontSize: 9, color: isSelected ? 'rgba(10,10,16,.75)' : KAI.text3, ...MONO_STYLE, fontWeight: 600 }}>
                        ¥{sp >= 1000 ? `${(sp / 1000).toFixed(sp >= 10000 ? 0 : 1)}k` : sp}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: KAI.text4, ...MONO_STYLE, letterSpacing: '.08em' }}>
              支出少 {[0.10, 0.22, 0.44, 0.70].map((a, i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: `rgba(251,148,119,${a})` }}/>)} 多
            </div>
          </div>

          {/* Day detail */}
          <div style={{ padding: '22px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: KAI.text3, ...MONO_STYLE, letterSpacing: '.08em' }}>2026.05.{String(selected).padStart(2, '0')}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: KAI.text1, marginTop: 2 }}>5月{selected}日 <span style={{ fontSize: 13, color: KAI.text3, fontWeight: 400 }}>土曜日</span></div>
              <div style={{ ...MONO_STYLE, fontSize: 30, fontWeight: 700, color: C_CORAL, letterSpacing: '-.02em', marginTop: 6 }}>
                ¥{(CAL_SPEND[selected] || 0).toLocaleString('ja-JP')}
              </div>
              <div style={{ fontSize: 11, color: KAI.text3, marginTop: 2 }}>食費 60% · 交通 23% · カフェ 17%</div>
            </div>

            <div style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, marginTop: 8 }}>取引（3件）</div>
            {TX_DAY.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < TX_DAY.length - 1 ? '1px solid rgba(255,255,255,.05)' : '0', animation: `kai-rise .4s ${.2 + i * .07}s ease-out both` }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11, flexShrink: 0,
                  background: `${t.color}1c`, border: `1px solid ${t.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.color,
                }}>
                  <Icon name={t.icon} size={16} stroke={2}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: KAI.text1, fontWeight: 500 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: KAI.text3 }}>{t.cat} · {t.time}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>
                  ¥{Math.abs(t.amount).toLocaleString('ja-JP')}
                </div>
              </div>
            ))}

            <button style={{
              marginTop: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.18)',
              borderRadius: 12, padding: '12px', color: KAI.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="plus" size={14}/> この日に支出を追加
            </button>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
