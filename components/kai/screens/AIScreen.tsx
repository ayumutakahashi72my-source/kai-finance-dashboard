'use client';

import { Utensils, Coffee, Lightbulb, Target, Sparkles } from 'lucide-react';
import { KAI } from '@/lib/kai-tokens';
import {
  useTypewriter, Icon, KaiSystemBrand, CAvatar,
  PhoneShell, DesktopShell, KaiSidebar, BottomBar, BlinkCaret, MONO_STYLE,
} from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;
const C_CORAL_SOFT = KAI.coralSoft;

function InsightPill({ icon, tone, label, value, sub }: {
  icon: React.ReactNode; tone: string; label: string; value: string; sub: string;
}) {
  return (
    <div style={{
      flexShrink: 0, padding: '8px 12px',
      background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10, minWidth: 130,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9,
        background: `${tone}18`, border: `1px solid ${tone}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone,
      }}>{icon}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: KAI.text1, ...MONO_STYLE, letterSpacing: '-.01em' }}>{value}</span>
        </div>
        <span style={{ fontSize: 9, color: KAI.text3, letterSpacing: '.04em' }}>{label} · {sub}</span>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
      <div style={{
        background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)',
        borderRadius: '16px 16px 4px 16px', padding: '9px 13px',
        fontSize: 13, color: KAI.textBody, lineHeight: 1.55,
      }}>{children}</div>
    </div>
  );
}

function AIBubble({ children, bg, border, delay = '0s' }: {
  children: React.ReactNode; bg: string; border: string; delay?: string;
}) {
  return (
    <div style={{
      alignSelf: 'flex-start', maxWidth: '88%',
      background: bg, border: `1px solid ${border}`,
      borderRadius: '16px 16px 16px 4px', padding: '9px 13px',
      fontSize: 13, color: KAI.textBody, lineHeight: 1.6,
      animation: `kai-rise .5s ${delay} ease-out both`,
    }}>{children}</div>
  );
}

function InsightCardLg({ icon, tone, title, body, delay = 0 }: {
  icon: React.ReactNode; tone: string; title: string; body: string; delay?: number;
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 14, display: 'flex', gap: 12,
      animation: `kai-rise .5s ${delay}s ease-out both`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: `${tone}18`, border: `1px solid ${tone}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: KAI.text1 }}>{title}</div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 3, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

interface AIScreenProps {
  onNavClick?: (id: string) => void;
  onAddClick?: () => void;
}

export function AIScreenMobile({ onNavClick, onAddClick }: AIScreenProps) {
  const m1 = useTypewriter('今月は順調！ 予算の 71% 消化、ペースは想定どおりだよ。', { speed: 22, delay: 800 });
  const m2 = useTypewriter('ただ外食費が先月比 +32% でちょっと伸びてる', { speed: 22, delay: m1.done ? 250 : 99999 });
  const m3 = useTypewriter('週末のカフェ代を ¥1,500 抑えれば、月末の予算内で着地できそう！', { speed: 20, delay: m2.done ? 300 : 99999 });

  return (
    <PhoneShell glow="warm" bg={KAI.bgCard}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
        <KaiSystemBrand size="sm"/>
        <CAvatar size={32}/>
      </header>

      <div style={{ flex: 1, padding: '4px 18px 0', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>AI サマリー</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,.1)',
            border: '1px solid rgba(74,222,128,.2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700, letterSpacing: '.08em',
          }}>● LIVE</span>
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, animation: 'kai-rise .5s ease-out both' }}>
          <InsightPill icon={<Utensils size={14} strokeWidth={2}/>} tone={C_CORAL} label="外食" value="+32%" sub="vs 4月"/>
          <InsightPill icon={<Coffee size={14} strokeWidth={2}/>} tone={C_PEACH} label="カフェ" value="¥6,400" sub="今月計"/>
          <InsightPill icon={<Lightbulb size={14} strokeWidth={2}/>} tone={C_BLUE}  label="固定費" value="安定" sub="先月並み"/>
          <InsightPill icon={<Target size={14} strokeWidth={2}/>} tone="#a78bfa" label="スコア" value="82pt" sub="B+ ↑"/>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <UserBubble>今月どんな感じ？</UserBubble>
          <AIBubble bg="rgba(251,148,119,.10)" border="rgba(251,148,119,.18)">
            {m1.shown}{!m1.done && <BlinkCaret color={C_CORAL}/>}
          </AIBubble>
          {m1.done && (
            <AIBubble bg="rgba(245,212,184,.08)" border="rgba(245,212,184,.18)" delay=".05s">
              {m2.shown}{!m2.done && <BlinkCaret color={C_PEACH}/>}
            </AIBubble>
          )}
          {m2.done && (
            <AIBubble bg="rgba(122,167,255,.10)" border="rgba(122,167,255,.18)" delay=".05s">
              {m3.shown}{!m3.done && <BlinkCaret color={C_BLUE}/>}
            </AIBubble>
          )}
          {m3.done && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, animation: 'kai-rise .5s ease-out both' }}>
              {['カフェ代の内訳', '他に削れそう？', '貯蓄ペース'].map(t => (
                <span key={t} style={{
                  fontSize: 11, color: KAI.text2, background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.10)', borderRadius: 99, padding: '5px 12px', cursor: 'pointer',
                }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
          borderRadius: 99, padding: '8px 8px 8px 16px',
        }}>
          <span style={{ flex: 1, fontSize: 13, color: KAI.text4 }}>kai に聞いてみる…</span>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.bg,
            boxShadow: `0 4px 12px ${C_CORAL}55`,
          }}>
            <Icon name="arrowRight" size={14} stroke={2.4}/>
          </div>
        </div>
      </div>

      <BottomBar active="ai" accent={C_CORAL} variant="fab" onAdd={onAddClick} onNav={onNavClick}/>
    </PhoneShell>
  );
}

export function AIScreenDesktop({ onNavClick }: AIScreenProps) {
  const m1 = useTypewriter('今月は順調！ 予算の 71% 消化、ペースは想定どおりだよ。', { speed: 22, delay: 800 });
  const m2 = useTypewriter('ただ外食費が先月比 +32% でちょっと伸びてる。週末のカフェ利用が増加傾向。', { speed: 22, delay: m1.done ? 250 : 99999 });
  const m3 = useTypewriter('週末のカフェ代を ¥1,500 抑えれば、月末の予算 ¥200,000 以内で着地できそう。外食を除けば実は先月より -¥3,000 という好成績だよ。', { speed: 20, delay: m2.done ? 300 : 99999 });

  return (
    <DesktopShell width={1100} height={680} glow="warm" bg={KAI.bgCard}>
      <KaiSidebar active="ai" accent={C_CORAL} accentSoft={C_CORAL_SOFT} brand={<KaiSystemBrand size="md"/>} onNav={onNavClick}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 30px', borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em' }}>AI サマリー</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,.1)',
              border: '1px solid rgba(74,222,128,.2)', borderRadius: 99, padding: '3px 9px', fontWeight: 700, letterSpacing: '.08em',
            }}>● LIVE · haiku 4.5</span>
          </div>
          <CAvatar size={36}/>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0, overflow: 'hidden' }}>
          {/* Chat column */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '22px 28px', borderRight: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: `linear-gradient(135deg, ${C_CORAL}, ${C_PEACH})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}><Sparkles size={17} strokeWidth={1.8}/></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: KAI.text1 }}>kai</div>
                  <div style={{ fontSize: 10, color: KAI.text3 }}>家計のお話相手 · オンライン</div>
                </div>
              </div>
              <UserBubble>今月どんな感じ？</UserBubble>
              <AIBubble bg="rgba(251,148,119,.10)" border="rgba(251,148,119,.18)">
                {m1.shown}{!m1.done && <BlinkCaret color={C_CORAL}/>}
              </AIBubble>
              {m1.done && (
                <AIBubble bg="rgba(245,212,184,.08)" border="rgba(245,212,184,.18)" delay=".05s">
                  {m2.shown}{!m2.done && <BlinkCaret color={C_PEACH}/>}
                </AIBubble>
              )}
              {m2.done && (
                <AIBubble bg="rgba(122,167,255,.10)" border="rgba(122,167,255,.18)" delay=".05s">
                  {m3.shown}{!m3.done && <BlinkCaret color={C_BLUE}/>}
                </AIBubble>
              )}
              {m3.done && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, animation: 'kai-rise .5s ease-out both' }}>
                  {['カフェ代の内訳', '他に削れそう？', '貯蓄ペース', '来月の予算は？'].map(t => (
                    <span key={t} style={{
                      fontSize: 12, color: KAI.text2, background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.10)', borderRadius: 99, padding: '6px 12px', cursor: 'pointer',
                    }}>{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
              borderRadius: 14, padding: '10px 12px',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: KAI.text4 }}>kai に家計のことを聞いてみる…</span>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: KAI.bg,
                boxShadow: `0 4px 12px ${C_CORAL}55`,
              }}>
                <Icon name="arrowRight" size={14} stroke={2.4}/>
              </div>
            </div>
          </div>

          {/* Insights column */}
          <div style={{ padding: '22px 24px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 700 }}>今週のハイライト</div>
            <InsightCardLg icon={<Utensils size={15} strokeWidth={2}/>} tone={C_CORAL} title="外食費が増加中" body="先月比 +32%（¥9,800増）。土日のディナー回数が増えています。" delay={0}/>
            <InsightCardLg icon={<Coffee size={15} strokeWidth={2}/>} tone={C_PEACH} title="カフェ習慣" body="週 3 回 → 平均 ¥640。月計 ¥6,400 を消費。" delay={0.1}/>
            <InsightCardLg icon={<Lightbulb size={15} strokeWidth={2}/>} tone={C_BLUE}  title="固定費は安定" body="家賃・光熱・サブスクは先月並み。¥44,150。" delay={0.2}/>
            <div style={{
              marginTop: 'auto', padding: '14px 16px',
              background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.18)',
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 10, color: '#a78bfa', letterSpacing: '.14em', fontWeight: 700, marginBottom: 6 }}>● 来月への提案</div>
              <div style={{ fontSize: 13, color: KAI.textBody, lineHeight: 1.55 }}>
                外食費の予算を <span style={{ color: '#a78bfa', fontWeight: 700 }}>¥35,000</span> に設定。
                浮いた分はインデックス積立に回すのがおすすめ。
              </div>
            </div>
          </div>
        </div>
      </div>
    </DesktopShell>
  );
}
