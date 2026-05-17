'use client';

import { KAI } from '@/lib/kai-tokens';
import { Icon, KaiSystemBrand, CAvatar, Ring, MONO_STYLE } from '@/components/kai/shared';

const C_CORAL = KAI.coral;
const C_BLUE = KAI.blue;
const C_PEACH = KAI.peach;

const CATEGORIES = [
  { name: '食費',   icon: 'cart',   color: C_CORAL,   on: true },
  { name: 'カフェ', icon: 'coffee', color: C_PEACH },
  { name: '交通',   icon: 'train',  color: C_BLUE },
  { name: '娯楽',   icon: 'bag',    color: KAI.tangerine },
  { name: '固定費', icon: 'home',   color: '#a78bfa' },
];

function SheetField({ label, value, placeholder, mono = false }: {
  label: string; value?: string; placeholder?: string; mono?: boolean;
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '9px 12px' }}>
      <div style={{ fontSize: 9, color: KAI.text3, letterSpacing: '.08em', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? KAI.text1 : KAI.text4, marginTop: 3, fontFamily: mono ? 'var(--font-jetbrains), JetBrains Mono, monospace' : 'inherit' }}>{value || placeholder}</div>
    </div>
  );
}

interface QuickAddSheetProps {
  onClose?: () => void;
  onSave?: () => void;
  amount?: number;
}

export function QuickAddSheetMobile({ onClose, onSave, amount = 3420 }: QuickAddSheetProps) {
  return (
    <>
      {/* dimmed dashboard backdrop */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35, filter: 'blur(2px)', zIndex: 4 }}>
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
        background: `linear-gradient(180deg, ${KAI.bgSheet} 0%, ${KAI.bgCard} 60%)`,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none',
        padding: '10px 22px 28px', display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: '0 -20px 60px rgba(0,0,0,.6)',
        animation: 'kai-sheet-up .5s cubic-bezier(.2,.85,.3,1) both',
        maxHeight: '88%',
      }}>
        {/* grab handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <div style={{ width: 42, height: 4, borderRadius: 99, background: 'rgba(255,255,255,.18)' }}/>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <div>
            <div style={{ fontSize: 9, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.14em', fontWeight: 700 }}>QUICK ENTRY</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: KAI.text1, letterSpacing: '-.02em', marginTop: 2 }}>支出を記録</div>
          </div>
          <span style={{ fontSize: 11, color: KAI.text3, fontFamily: 'var(--font-jetbrains), JetBrains Mono, monospace', letterSpacing: '.08em' }}>5/16 19:42</span>
        </div>

        {/* Amount */}
        <div style={{
          background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 18, padding: '18px 18px', textAlign: 'center',
          animation: 'kai-rise .5s .15s ease-out both',
        }}>
          <div style={{ fontSize: 10, color: KAI.text3, letterSpacing: '.14em', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>金額</div>
          <div style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 4,
            ...MONO_STYLE, fontWeight: 800,
            background: `linear-gradient(135deg, #f0f0f5 0%, ${C_CORAL} 80%)`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            letterSpacing: '-.04em',
          }}>
            <span style={{ fontSize: 24, color: KAI.text4, WebkitTextFillColor: KAI.text4 }}>¥</span>
            <span style={{ fontSize: 46, lineHeight: 1 }}>{amount.toLocaleString('ja-JP')}</span>
            <span style={{ display: 'inline-block', width: 2, height: 34, background: C_CORAL, marginLeft: 1, animation: 'kai-blink 1s steps(2) infinite' }}/>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: KAI.text3 }}>+ 後でメモを追加できます</div>
        </div>

        {/* Category */}
        <div style={{ animation: 'kai-rise .5s .25s ease-out both' }}>
          <div style={{ fontSize: 10, color: KAI.text4, letterSpacing: '.14em', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>カテゴリ</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {CATEGORIES.map(c => (
              <div key={c.name} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px', borderRadius: 99, cursor: 'pointer',
                background: c.on ? `${c.color}22` : 'rgba(255,255,255,.03)',
                border: `1px solid ${c.on ? c.color + '66' : 'rgba(255,255,255,.08)'}`,
                color: c.on ? c.color : KAI.text2,
                fontSize: 12, fontWeight: c.on ? 700 : 500,
              }}>
                <Icon name={c.icon} size={13} stroke={2}/> {c.name}
              </div>
            ))}
          </div>
        </div>

        {/* Memo + payment method row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'kai-rise .5s .35s ease-out both' }}>
          <SheetField label="メモ" value="成城石井 ディナー" placeholder="任意"/>
          <SheetField label="支払い" value="楽天カード" mono/>
        </div>

        {/* Save buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, animation: 'kai-rise .5s .45s ease-out both' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '14px',
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)',
            borderRadius: 14, color: KAI.text2, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>キャンセル</button>
          <button onClick={onSave} style={{
            flex: 2, padding: '14px',
            background: `linear-gradient(135deg, ${C_CORAL}, ${C_BLUE})`, border: 'none',
            borderRadius: 14, color: KAI.bg, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: `0 8px 28px ${C_CORAL}44`,
          }}>
            <Icon name="check" size={16} stroke={2.6}/> 保存
          </button>
        </div>
      </div>
    </>
  );
}
