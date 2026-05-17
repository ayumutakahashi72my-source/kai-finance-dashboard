'use client';

import { KAI } from '@/lib/kai-tokens';
import { Icon, KaiSystemBrand, CAvatar, KaiLogo, Ring } from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_CORAL_SOFT = KAI.coralSoft;

const GLYPH_MANUAL = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
  </svg>
);
const GLYPH_CSV = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/><path d="M8 13h2M8 17h6M12 13h4"/>
  </svg>
);
const GLYPH_MF = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

function PickerOption({ kind, tone, title, sub, tag, tagTone, idx = 0, onClick }: {
  kind: 'manual' | 'csv' | 'mf'; tone: string; title: string; sub: string;
  tag?: string; tagTone?: string; idx?: number; onClick?: () => void;
}) {
  const glyph = { manual: GLYPH_MANUAL, csv: GLYPH_CSV, mf: GLYPH_MF }[kind];
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 14px',
      background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
      borderRadius: 16, cursor: 'pointer',
      animation: `kai-rise .5s ${0.1 + idx * 0.07}s ease-out both`,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0,
        background: `${tone}1a`, border: `1px solid ${tone}33`, color: tone,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
      }}>{glyph}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: KAI.text1 }}>{title}</span>
          {tag && tagTone && (
            <span style={{
              fontSize: 9, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '.08em',
              color: tagTone, background: `${tagTone}1a`, border: `1px solid ${tagTone}33`,
              borderRadius: 5, padding: '1px 5px',
            }}>{tag}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: KAI.text3, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
      </div>
      <span style={{ color: KAI.text4, fontSize: 18 }}>›</span>
    </div>
  );
}

interface AddPickerSheetProps {
  onClose?: () => void;
  onManual?: () => void;
  onCsv?: () => void;
  onMf?: () => void;
}

export function AddPickerSheetMobile({ onClose, onManual, onCsv, onMf }: AddPickerSheetProps) {
  return (
    <>
      {/* Dimmed backdrop */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.30, filter: 'blur(3px)', zIndex: 4 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
          <KaiSystemBrand size="sm"/>
          <CAvatar size={32}/>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 50 }}>
          <Ring percent={71} size={170} stroke={12} color={C_CORAL} delay={0}/>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: KAI.bgOverlay, backdropFilter: 'blur(4px)', zIndex: 5 }} onClick={onClose}/>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10,
        background: `linear-gradient(180deg, ${KAI.bgSheet} 0%, ${KAI.bgCard} 70%)`,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none',
        padding: '10px 18px 28px', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 -20px 60px rgba(0,0,0,.6)',
        animation: 'kai-sheet-up .5s cubic-bezier(.2,.85,.3,1) both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.18)' }}/>
        </div>
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 9, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.14em', fontWeight: 700 }}>ADD ENTRY</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 3 }}>支出を追加</div>
          <div style={{ fontSize: 12, color: KAI.text3, marginTop: 4 }}>どの方法で記録しますか？</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
          <PickerOption kind="manual" tone={C_CORAL}   title="手入力"                  sub="1件ずつ素早く記録 · 約10秒"          tag="今すぐ" tagTone={C_CORAL}   idx={0} onClick={onManual}/>
          <PickerOption kind="csv"    tone={C_BLUE}    title="CSV取込み"                sub="クレカ明細・銀行データを一括取込"      tag="一括"   tagTone={C_BLUE}    idx={1} onClick={onCsv}/>
          <PickerOption kind="mf"     tone="#a78bfa"   title="MoneyForward Me 連携"    sub="毎朝6:00に自動で全口座を取込"          tag="自動"   tagTone="#a78bfa"   idx={2} onClick={onMf}/>
        </div>

        <button onClick={onClose} style={{
          marginTop: 'auto',
          background: 'transparent', border: '1px solid rgba(255,255,255,.10)',
          borderRadius: 14, padding: '12px', color: KAI.text3, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>キャンセル</button>
      </div>
    </>
  );
}

export function AddPickerSheetDesktop({ onClose, onManual, onCsv, onMf }: AddPickerSheetProps) {
  const GLYPH_MANUAL_LG = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  );
  const GLYPH_CSV_LG = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/><path d="M8 13h2M8 17h6M12 13h4"/>
    </svg>
  );
  const GLYPH_MF_LG = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  );

  const cards = [
    { kind: 'manual' as const, tone: C_CORAL,   glyph: GLYPH_MANUAL_LG, title: '手入力',       sub: '1件ずつ素早く記録',      tag: '今すぐ', tagTone: C_CORAL,   hotkey: '1', onClick: onManual },
    { kind: 'csv'    as const, tone: C_BLUE,    glyph: GLYPH_CSV_LG,    title: 'CSV取込み',    sub: '明細を一括で取込',        tag: '一括',   tagTone: C_BLUE,    hotkey: '2', onClick: onCsv },
    { kind: 'mf'     as const, tone: '#a78bfa', glyph: GLYPH_MF_LG,     title: 'MF Me 連携',  sub: '毎朝自動で全口座取込',    tag: '自動',   tagTone: '#a78bfa', hotkey: '3', onClick: onMf },
  ];

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,12,0.62)', backdropFilter: 'blur(6px)', zIndex: 5 }} onClick={onClose}/>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10, width: 680,
        background: `linear-gradient(180deg, ${KAI.bgSheet} 0%, ${KAI.bgCard} 70%)`,
        borderRadius: 22, border: '1px solid rgba(255,255,255,.10)',
        padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 18,
        boxShadow: '0 30px 90px rgba(0,0,0,.7)',
        animation: 'kai-rise .5s ease-out both',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.14em', fontWeight: 700 }}>ADD ENTRY</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 4 }}>支出を追加</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,.10)', background: 'rgba(255,255,255,.04)', color: KAI.text2, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: KAI.text3, marginTop: -8 }}>
          どの方法で記録しますか？ ショートカットキー
          {' '}<kbd style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace' }}>1</kbd>
          /<kbd style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace' }}>2</kbd>
          /<kbd style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 5, padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace' }}>3</kbd>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {cards.map((c, idx) => (
            <div key={c.kind} onClick={c.onClick} style={{
              padding: '20px 18px', cursor: 'pointer',
              background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
              borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12,
              animation: `kai-rise .5s ${0.1 + idx * 0.06}s ease-out both`, position: 'relative',
            }}>
              <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', color: KAI.text4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 5, padding: '1px 6px' }}>{c.hotkey}</div>
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `${c.tone}1a`, border: `1px solid ${c.tone}33`, color: c.tone, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)' }}>{c.glyph}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: KAI.text1 }}>{c.title}</span>
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '.08em', color: c.tagTone, background: `${c.tagTone}1a`, border: `1px solid ${c.tagTone}33`, borderRadius: 5, padding: '1px 6px' }}>{c.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: KAI.text3, marginTop: 4, lineHeight: 1.5 }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
