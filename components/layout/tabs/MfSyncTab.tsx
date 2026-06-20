'use client'

import { useState, useEffect } from 'react'
import { Mail, Globe } from 'lucide-react'
import { CORAL, BLUE, GREEN, RED, AMBER, TEXT1, TEXT2, TEXT3, TEXT4, BG, OVERLAY_WEAK, BORDER2, BORDER_STRONG, SyncResult, BackBtn } from './_shared'

const MF_FEATURES = [
  {
    bg: 'rgba(251,148,119,.18)', color: CORAL,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    title: '毎朝の自動同期', sub: '6:00 に当月の全口座を取込',
  },
  {
    bg: 'rgba(122,167,255,.14)', color: BLUE,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
    title: '複数口座まとめて', sub: 'クレカ・銀行・電子マネー',
  },
  {
    bg: 'rgba(251,148,119,.18)', color: CORAL,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    title: '認証情報は暗号化', sub: '閲覧専用アクセスのみ',
  },
] as const

interface OtpPending {
  otp_url: string
  otp_storage_state: string
}

export function MfSyncTab({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [enabled,      setEnabled]      = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [syncing,      setSyncing]      = useState(false)
  const [syncResult,   setSyncResult]   = useState<SyncResult | null>(null)
  const [syncError,    setSyncError]    = useState<string | null>(null)
  const [syncYear,     setSyncYear]     = useState(() => new Date().getFullYear())
  const [syncMonth,    setSyncMonth]    = useState(() => new Date().getMonth() + 1)
  const [showNoCredsAlert, setShowNoCredsAlert] = useState(false)
  const [otpPending,   setOtpPending]   = useState<OtpPending | null>(null)
  const [otpCode,      setOtpCode]      = useState('')
  const [otpError,     setOtpError]     = useState<string | null>(null)
  const [browserMode,  setBrowserMode]  = useState(false)
  const [sessionCookie, setSessionCookie] = useState('')

  useEffect(() => {
    fetch('/api/settings/mf')
      .then(r => r.json())
      .then((d: { mf_enabled?: boolean }) => { setEnabled(d.mf_enabled ?? false); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function clearOtp() { setOtpPending(null); setOtpCode(''); setOtpError(null); setBrowserMode(false); setSessionCookie('') }

  async function handleSync() {
    if (!enabled) { setShowNoCredsAlert(true); return }
    setSyncing(true); setSyncError(null); setSyncResult(null)
    const res = await fetch('/api/settings/mf/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: syncYear, month: syncMonth }),
    })
    const data = await res.json() as SyncResult & { error?: string; needs_otp?: boolean; otp_url?: string; otp_storage_state?: string; trace?: { step: string; note: string }[] }
    setSyncing(false)
    if (data.needs_otp && data.otp_url && data.otp_storage_state) {
      setOtpPending({ otp_url: data.otp_url, otp_storage_state: data.otp_storage_state })
    } else if (data.error) {
      const loginSteps = data.trace?.filter(t => /^[2-7]_/.test(t.step)) ?? []
      const traceInfo = loginSteps.map(t => `[${t.step}] ${t.note}`).join('\n')
      setSyncError(data.error + (traceInfo ? `\n\n${traceInfo}` : ''))
    } else {
      setSyncResult(data)
    }
  }

  async function handleBrowserSessionSubmit() {
    if (!sessionCookie.trim()) return
    setSyncing(true); setOtpError(null)
    const res = await fetch('/api/settings/mf/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: syncYear, month: syncMonth, session_cookie: sessionCookie.trim() }),
    })
    const data = await res.json() as SyncResult & { error?: string }
    setSyncing(false)
    if (data.error) { setOtpError(data.error) }
    else { clearOtp(); setSyncResult(data) }
  }

  async function handleOtpSubmit() {
    if (!otpPending || otpCode.length < 6) return
    setSyncing(true); setOtpError(null)
    const res = await fetch('/api/settings/mf/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: syncYear, month: syncMonth, otp_code: otpCode, otp_url: otpPending.otp_url, otp_storage_state: otpPending.otp_storage_state }),
    })
    const data = await res.json() as SyncResult & { error?: string; needs_otp?: boolean; trace?: { step: string; note: string }[] }
    setSyncing(false)
    if (data.error) {
      const otpTrace = data.trace?.filter(t => t.step.startsWith('otp_')).map(t => `[${t.step}] ${t.note}`).join('\n') ?? ''
      setOtpError(data.error + (otpTrace ? `\n\n${otpTrace}` : ''))
    } else if (data.needs_otp) {
      setOtpError('認証コードが正しくありません。再度お試しください。')
    } else {
      clearOtp(); setSyncResult(data)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackBtn onClick={onBack}/>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
          <div style={{ height: 180, borderRadius: 20, background: OVERLAY_WEAK, animation: 'kai-blink 1.4s steps(2) infinite' }}/>
          {[1,2,3].map(i => <div key={i} style={{ height: 64, borderRadius: 16, background: OVERLAY_WEAK, animation: `kai-blink 1.4s ${i * 0.15}s steps(2) infinite` }}/>)}
        </div>
      ) : (
        <>
          {/* Hero card */}
          <div style={{ background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.22)', borderRadius: 20, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, animation: 'kai-rise .6s ease-out both', boxShadow: '0 0 40px rgba(167,139,250,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <div style={{ padding: 2.5, borderRadius: 18, flexShrink: 0, background: 'linear-gradient(135deg, rgba(251,148,119,.9) 0%, rgba(122,167,255,.85) 100%)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, background: '#131020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" width="32" height="32">
                    <path d="M2 17h5l4-9 7 18 4-9h8" stroke="url(#mfs-wave)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs><linearGradient id="mfs-wave" x1="2" y1="17" x2="30" y2="17" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#5eead4"/></linearGradient></defs>
                  </svg>
                </div>
              </div>
              <div style={{ flex: 1, maxWidth: 80, height: 2, position: 'relative', margin: '0 8px' }}>
                <div style={{ position: 'absolute', inset: 0, background: BORDER_STRONG, borderRadius: 99 }}/>
                <div style={{ position: 'absolute', top: '50%', left: 0, width: 10, height: 10, borderRadius: '50%', background: CORAL, boxShadow: `0 0 10px ${CORAL}99`, transform: 'translateY(-50%)', ['--mfc-line' as string]: '68px', animation: 'mfc-dot 2s cubic-bezier(.45,0,.55,1) infinite' }}/>
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0, background: 'rgba(14,24,52,.9)', border: '1px solid rgba(122,167,255,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: BLUE, letterSpacing: '-.04em' }}>MF</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TEXT1, letterSpacing: '-.02em' }}>kai に MF Me を接続</div>
              <div style={{ fontSize: 12, color: TEXT3, marginTop: 6, lineHeight: 1.65 }}>連携すると、毎朝 6:00 に当月の取引が自動で取込まれます。</div>
            </div>
          </div>

          {/* Feature rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MF_FEATURES.map((f, i) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 14, background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, borderRadius: 16, padding: '14px 16px', animation: `kai-rise .5s ${.1 + i * .07}s ease-out both` }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: TEXT3, marginTop: 2 }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Connected status */}
          {enabled && (
            <div style={{ background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.22)', borderRadius: 14, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, animation: 'kai-rise .5s .28s ease-out both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>連携済み</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, boxShadow: '0 0 6px rgba(74,222,128,.7)' }}/>
                </div>
                <span style={{ fontSize: 11, color: TEXT3 }}>取込む月を選択</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: '7px 10px' }}>
                  <button type="button" disabled={syncing || syncYear <= new Date().getFullYear() - 2} onClick={() => setSyncYear(y => y - 1)} style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', opacity: syncYear <= new Date().getFullYear() - 2 ? 0.3 : 1 }}>‹</button>
                  <span style={{ fontSize: 13, color: TEXT1, fontWeight: 600, minWidth: 44, textAlign: 'center' }}>{syncYear}年</span>
                  <button type="button" disabled={syncing || syncYear >= new Date().getFullYear()} onClick={() => setSyncYear(y => y + 1)} style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', opacity: syncYear >= new Date().getFullYear() ? 0.3 : 1 }}>›</button>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: '7px 10px' }}>
                  <button type="button" disabled={syncing || syncMonth <= 1} onClick={() => setSyncMonth(m => m - 1)} style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', opacity: syncMonth <= 1 ? 0.3 : 1 }}>‹</button>
                  <span style={{ fontSize: 13, color: TEXT1, fontWeight: 600, minWidth: 32, textAlign: 'center' }}>{syncMonth}月</span>
                  <button type="button" disabled={syncing || syncMonth >= 12} onClick={() => setSyncMonth(m => m + 1)} style={{ background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', opacity: syncMonth >= 12 ? 0.3 : 1 }}>›</button>
                </div>
              </div>
              {syncResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>✓ {syncResult.year}年{syncResult.month}月 取込完了</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: TEXT3, letterSpacing: '.06em', fontWeight: 600 }}>新規取込</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: GREEN, fontFamily: 'var(--font-mono),monospace', marginTop: 2 }}>{syncResult.inserted}</div>
                    </div>
                    <div style={{ flex: 1, background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: TEXT3, letterSpacing: '.06em', fontWeight: 600 }}>スキップ</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: TEXT3, fontFamily: 'var(--font-mono),monospace', marginTop: 2 }}>{syncResult.skipped}</div>
                    </div>
                  </div>
                  {syncResult.inserted === 0 && syncResult.skipped > 0 && <div style={{ fontSize: 11, color: TEXT4 }}>すでに取込済みのデータです</div>}
                  {syncResult.inserted === 0 && syncResult.skipped === 0 && <div style={{ fontSize: 11, color: TEXT4 }}>この月のデータが見つかりませんでした</div>}
                  <button type="button" onClick={onDone} style={{ width: '100%', fontSize: 13, fontWeight: 700, color: GREEN, background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', borderRadius: 10, padding: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>完了</button>
                </div>
              )}
              {syncError && <div style={{ fontSize: 11, color: RED, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>⚠ {syncError}</div>}
            </div>
          )}

          {/* Warning */}
          <div style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.28)', borderRadius: 14, padding: '11px 14px', display: 'flex', gap: 9, alignItems: 'flex-start', animation: 'kai-rise .5s .35s ease-out both' }}>
            <span style={{ fontSize: 13, color: AMBER, flexShrink: 0, marginTop: 1 }}>⚠</span>
            <div style={{ fontSize: 11, color: `${AMBER}ee`, lineHeight: 1.6 }}>非公式 API を使用。MF 仕様変更で停止する可能性あり。専用 MF サブアカウント推奨</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8, animation: 'kai-rise .5s .42s ease-out both' }}>
            <button type="button" onClick={onBack} style={{ flex: 1, padding: '15px', textAlign: 'center', background: OVERLAY_WEAK, border: `1px solid ${BORDER_STRONG}`, borderRadius: 99, color: TEXT2, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>戻る</button>
            <button type="button" onClick={handleSync} disabled={syncing} style={{ flex: 2, padding: '15px', background: enabled ? `linear-gradient(135deg, ${CORAL} 0%, ${BLUE} 100%)` : OVERLAY_WEAK, border: enabled ? 'none' : `1px solid ${BORDER_STRONG}`, borderRadius: 99, color: enabled ? '#0c0a14' : TEXT3, fontSize: 15, fontWeight: 800, cursor: syncing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: enabled ? `0 8px 24px ${CORAL}44` : 'none', opacity: syncing ? 0.7 : 1, transition: 'opacity .2s' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
              {syncing ? '取込中…' : `${syncYear}年${syncMonth}月を取込`}
            </button>
          </div>

          {/* OTP modal */}
          {otpPending && (
            <>
              <div onClick={clearOtp} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}/>
              <div style={{ position: 'fixed', left: '50%', top: '50%', zIndex: 61, transform: 'translate(-50%, -50%)', width: 'min(360px, calc(100vw - 40px))', background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 20, padding: '24px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
                <div style={{ display: 'flex', gap: 6, background: OVERLAY_WEAK, borderRadius: 10, padding: 4 }}>
                  {(['code', 'browser'] as const).map(mode => (
                    <button key={mode} onClick={() => { setBrowserMode(mode === 'browser'); setOtpError(null) }} style={{ flex: 1, padding: '7px 4px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: (mode === 'browser') === browserMode ? BORDER_STRONG : 'transparent', color: (mode === 'browser') === browserMode ? TEXT1 : TEXT3 }}>
                      {mode === 'code' ? <><Mail size={12} strokeWidth={2}/> コード入力</> : <><Globe size={12} strokeWidth={2}/> ブラウザ認証</>}
                    </button>
                  ))}
                </div>
                {!browserMode ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, marginBottom: 5 }}>メール認証コードを入力</div>
                      <div style={{ fontSize: 11, color: TEXT3, lineHeight: 1.6 }}>MoneyForwardから届いたメールの6桁コード</div>
                    </div>
                    <input type="text" inputMode="numeric" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter') handleOtpSubmit() }} placeholder="123456" autoFocus style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, background: OVERLAY_WEAK, border: `1px solid ${otpError ? RED + '66' : BORDER_STRONG}`, color: TEXT1, fontSize: 24, fontWeight: 800, letterSpacing: '0.3em', textAlign: 'center', fontFamily: 'var(--font-mono),monospace', outline: 'none' }}/>
                    {otpError && <div style={{ fontSize: 11, color: RED, whiteSpace: 'pre-wrap', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto', background: `${RED}0a`, border: `1px solid ${RED}33`, borderRadius: 8, padding: '8px 10px' }}>⚠ {otpError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={clearOtp} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, color: TEXT2, cursor: 'pointer', fontFamily: 'inherit' }}>キャンセル</button>
                      <button onClick={handleOtpSubmit} disabled={otpCode.length < 6 || syncing} style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: otpCode.length >= 6 && !syncing ? `linear-gradient(135deg,${CORAL} 0%,${BLUE} 100%)` : OVERLAY_WEAK, border: 'none', color: otpCode.length >= 6 && !syncing ? '#0c0a14' : TEXT3, cursor: otpCode.length >= 6 && !syncing ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: syncing ? 0.7 : 1 }}>{syncing ? '認証中…' : '認証する'}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: TEXT3, lineHeight: 1.8, background: OVERLAY_WEAK, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ color: TEXT2, fontWeight: 700, marginBottom: 6, fontSize: 12 }}>手順</div>
                      <div>① 下のボタンでMoneyForwardを開く</div>
                      <div>② OTPを入力してログイン完了</div>
                      <div>③ DevTools (F12) → Application → Cookies → moneyforward.com</div>
                      <div style={{ paddingLeft: 12 }}>→ <code style={{ background: BORDER2, borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 10 }}>_moneyforward_session</code> をコピー</div>
                      <div>④ 下に貼り付けて「取込む」</div>
                    </div>
                    <a href="https://moneyforward.com/sign_in" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, rgba(122,167,255,.2) 0%, rgba(122,167,255,.1) 100%)', border: '1px solid rgba(122,167,255,.4)', color: BLUE, textDecoration: 'none', fontFamily: 'inherit' }}>
                      <Globe size={13} strokeWidth={2}/> MoneyForwardを開く ↗
                    </a>
                    <input type="password" value={sessionCookie} onChange={e => setSessionCookie(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleBrowserSessionSubmit() }} placeholder="_moneyforward_session=... または値のみ" style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, background: OVERLAY_WEAK, border: `1px solid ${otpError ? RED + '66' : BORDER_STRONG}`, color: TEXT1, fontSize: 11, fontFamily: 'var(--font-mono),monospace', outline: 'none' }}/>
                    {otpError && <div style={{ fontSize: 11, color: RED, lineHeight: 1.5, background: `${RED}0a`, border: `1px solid ${RED}33`, borderRadius: 8, padding: '8px 10px' }}>⚠ {otpError}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={clearOtp} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, color: TEXT2, cursor: 'pointer', fontFamily: 'inherit' }}>キャンセル</button>
                      <button onClick={handleBrowserSessionSubmit} disabled={!sessionCookie.trim() || syncing} style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: sessionCookie.trim() && !syncing ? `linear-gradient(135deg,${CORAL} 0%,${BLUE} 100%)` : OVERLAY_WEAK, border: 'none', color: sessionCookie.trim() && !syncing ? '#0c0a14' : TEXT3, cursor: sessionCookie.trim() && !syncing ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: syncing ? 0.7 : 1 }}>{syncing ? '取込中…' : '取込む'}</button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* 未登録アラート */}
          {showNoCredsAlert && (
            <>
              <div onClick={() => setShowNoCredsAlert(false)} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}/>
              <div style={{ position: 'fixed', left: '50%', top: '50%', zIndex: 61, transform: 'translate(-50%, -50%)', width: 'min(320px, calc(100vw - 40px))', background: BG, border: `1px solid ${BORDER_STRONG}`, borderRadius: 20, padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(251,191,36,.12)', border: '1px solid rgba(251,191,36,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚠</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: TEXT1, marginBottom: 8 }}>MF連携が未設定です</div>
                  <div style={{ fontSize: 12, color: TEXT3, lineHeight: 1.65 }}>設定画面でMoneyForward Meの<br/>IDとパスワードを登録してください。</div>
                </div>
                <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 4 }}>
                  <button onClick={() => setShowNoCredsAlert(false)} style={{ flex: 1, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: OVERLAY_WEAK, border: `1px solid ${BORDER2}`, color: TEXT2, cursor: 'pointer', fontFamily: 'inherit' }}>閉じる</button>
                  <a href="/settings/integrations/mf" style={{ flex: 2, padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${CORAL} 0%, ${BLUE} 100%)`, color: 'var(--kai-bg)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>設定画面へ</a>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
