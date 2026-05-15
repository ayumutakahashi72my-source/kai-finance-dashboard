import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS  (v1-neo DNA)
═══════════════════════════════════════════════════════════ */
/* v6: WCAG AA準拠 カラートークン
   - TEXT3 を #5e5e72 → #8b8ba0 へ（情報を担うラベル用、約4.7:1で AA 合格）
   - 旧 TEXT3 は装飾専用 TEXT_DECO に退避
   - BORDER は 0.07 → 0.10 へ（UIコンポーネント 3:1 ライン確保）
*/
const BG        = "#0a0a10";
const PANEL     = "rgba(20,22,32,0.66)";
const PANEL_SOLID = "#14161f";                /* リスト等テキスト密度高の場所用 */
const BORDER    = "rgba(255,255,255,0.10)";   /* ★ 0.07 → 0.10（コントラスト3:1確保） */
const BORDERS   = "rgba(255,255,255,0.16)";
const TEXT      = "#f0f0f5";                  /* 本文。17.5:1 (AAA) */
const TEXT2     = "#c4c4d0";                  /* ★ a1a1b3 → c4c4d0（10.4:1 AAA） */
const TEXT3     = "#8b8ba0";                  /* ★ 5e5e72 → 8b8ba0（4.7:1 AA、情報ラベル用） */
const TEXT_DECO = "#5e5e72";                  /* 装飾専用（区切り線色など、文字情報には使わない） */
const MINT      = "#5eead4";
const MINTG     = "rgba(94,234,212,0.28)";
const VIOLET    = "#a78bfa";
const UP        = "#4ade80";
const DOWN      = "#fb7185";
const AMBER     = "#fbbf24";
const CYAN      = "#22d3ee";

/* ═══════════════════════════════════════════════════════════
   DATA  (shared.jsx)
═══════════════════════════════════════════════════════════ */
const fmt  = (n) => `¥${Math.abs(Number(n)).toLocaleString()}`;
const fmtK = (n) => `${(Math.abs(n)/10000).toFixed(1)}万`;

const CATEGORIES = [
  { name:"食費",     value:42000, budget:50000, icon:"◉", color:MINT },
  { name:"外食",     value:18500, budget:15000, icon:"◇", color:DOWN },
  { name:"交通費",   value:12300, budget:15000, icon:"→", color:VIOLET },
  { name:"日用品",   value: 8900, budget:10000, icon:"▢", color:CYAN },
  { name:"光熱費",   value:14200, budget:15000, icon:"⚡", color:VIOLET },
  { name:"サブスク", value: 6800, budget: 7000, icon:"◈", color:"#f472b6" },
  { name:"娯楽",     value:22000, budget:20000, icon:"♪", color:DOWN },
  { name:"医療",     value: 3200, budget: 5000, icon:"✚", color:AMBER },
];

const MONTHLY = [
  { m:"12",inc:380000,exp:295000 },
  { m:"01",inc:380000,exp:312000 },
  { m:"02",inc:395000,exp:288000 },
  { m:"03",inc:380000,exp:335000 },
  { m:"04",inc:410000,exp:298000 },
  { m:"05",inc:380000,exp:271700 },
];

const TX = [
  { id:1, date:"05/13", time:"19:24", memo:"ライフ 三軒茶屋",      cat:"食費",     amt:-3240,  type:"exp" },
  { id:2, date:"05/12", time:"08:12", memo:"STARBUCKS",            cat:"外食",     amt: -680,  type:"exp" },
  { id:3, date:"05/12", time:"00:00", memo:"給与振込",              cat:"給与",     amt:380000, type:"inc" },
  { id:4, date:"05/11", time:"07:45", memo:"Suica オートチャージ",  cat:"交通費",   amt:-3000,  type:"exp" },
  { id:5, date:"05/10", time:"03:00", memo:"NETFLIX",              cat:"サブスク", amt:-1490,  type:"exp" },
  { id:6, date:"05/10", time:"21:33", memo:"マツモトキヨシ",        cat:"日用品",   amt:-2180,  type:"exp" },
  { id:7, date:"05/09", time:"14:02", memo:"東京電力 電気料金",     cat:"光熱費",   amt:-8400,  type:"exp" },
];

const ALERTS = [
  { id:1, kind:"over",  icon:"⚠",  title:"外食予算オーバー",    body:"¥18,500 / ¥15,000（¥3,500 超過）", time:"2時間前",  level:"warn" },
  { id:2, kind:"ai",    icon:"AI", title:"Adobe CC 見直し候補", body:"8ヶ月連続。月¥6,480 の節約余地",    time:"今日 09:12",level:"info" },
  { id:3, kind:"achv",  icon:"★",  title:"7日連続記録達成",     body:"コツコツ貯蓄者 +21pt",              time:"昨日",     level:"good" },
  { id:4, kind:"sub",   icon:"◈",  title:"Netflix 自動更新",   body:"¥1,490 課金されました",             time:"3日前",    level:"neutral"},
  { id:5, kind:"ai",    icon:"AI", title:"今月のサマリー",      body:"支出 −8.8%。収支は +¥108,300",     time:"今週",     level:"info" },
];

const MOM = [
  { name:"外食",   diff:+3200, pct:+21 },
  { name:"娯楽",   diff:+5000, pct:+29 },
  { name:"食費",   diff:-3800, pct: -8 },
  { name:"交通費", diff:-1200, pct: -9 },
  { name:"日用品", diff: +600, pct: +7 },
];

const SCORE_HIST = [
  {m:"12",s:58},{m:"01",s:62},{m:"02",s:75},{m:"03",s:48},{m:"04",s:81},{m:"05",s:73}
];

/* ═══════════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:${BG};color:${TEXT};font-family:'Noto Sans JP',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;font-size:16px}
button{cursor:pointer;font-family:inherit;min-height:32px}
input,select,textarea{font-size:16px !important} /* iOS Safari の自動ズーム回避 */

@keyframes revealUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes growBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes meshShift{0%{transform:translate(0,0) scale(1)}50%{transform:translate(2%,1%) scale(1.04)}100%{transform:translate(-2%,-1%) scale(1.02)}}
@keyframes scoreArc{from{stroke-dasharray:0 999}to{}}
@keyframes ringPulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.2;transform:scale(1.5)}}

/* ★ WCAG 2.3.3 — prefers-reduced-motion 対応
   システム設定で「視差効果を減らす」を有効にしているユーザーには
   非必須アニメーションを全停止。最終状態は維持する */
@media (prefers-reduced-motion: reduce) {
  *,*::before,*::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .ticker-track { animation-play-state: paused !important; }
  .mesh-bg { animation: none !important; }
}

/* ★ ラベル：9px → 11px に拡大（補助情報の最小可読サイズ確保） */
.mono{font-family:'JetBrains Mono',monospace;font-feature-settings:'tnum' 1}
.lbl{font-size:11px;font-weight:700;color:${TEXT3};letter-spacing:.14em;text-transform:uppercase;font-family:'JetBrains Mono',monospace}

/* フォーカスリング — キーボード操作時の可視化 */
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible {
  outline: 2px solid ${MINT};
  outline-offset: 2px;
}

::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10);border-radius:99px}
`;

/* ═══════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════ */
function useCountUp(target, dur=900) {
  const [v,setV] = useState(0);
  useEffect(()=>{
    let s=null,r;
    const t=(ts)=>{
      if(!s)s=ts;
      const p=Math.min((ts-s)/dur,1);
      setV(Math.round((1-Math.pow(1-p,4))*target));
      if(p<1)r=requestAnimationFrame(t);
    };
    r=requestAnimationFrame(t);
    return()=>cancelAnimationFrame(r);
  },[target,dur]);
  return v;
}

/* ═══════════════════════════════════════════════════════════
   ATOMS
═══════════════════════════════════════════════════════════ */
const panel = {
  background: PANEL,
  backdropFilter: "blur(24px) saturate(160%)",
  WebkitBackdropFilter: "blur(24px) saturate(160%)",
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  position: "relative",
  overflow: "hidden",
};

function Reveal({ children, delay=0 }) {
  return (
    <div style={{ animation:`revealUp 540ms cubic-bezier(.16,1,.3,1) both`, animationDelay:`${delay}ms` }}>
      {children}
    </div>
  );
}

function Spark({ data, w=80, h=24, stroke=MINT }) {
  const max=Math.max(...data), min=Math.min(...data), rng=max-min||1;
  const pts=data.map((v,i)=>[i/(data.length-1)*w, h-((v-min)/rng)*h*.9-h*.05]);
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} style={{overflow:"visible"}}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function LiveDot({ color=UP }) {
  return <span style={{display:"inline-block",width:6,height:6,borderRadius:99,background:color,animation:"pulseDot 1.8s infinite",boxShadow:`0 0 6px ${color}`}} />;
}

const TooltipDark = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(20,22,32,.92)", backdropFilter:"blur(20px)", border:`1px solid ${BORDERS}`, borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 8px 32px rgba(0,0,0,.5)" }}>
      <p className="mono" style={{ fontWeight:700, color:TEXT, marginBottom:6 }}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} className="mono" style={{ color:p.color, marginBottom:2 }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SCORE RING
═══════════════════════════════════════════════════════════ */
function ScoreRing({ score }) {
  const v = useCountUp(score, 1400);
  const r=52, cx=66, cy=66, circ=2*Math.PI*r;
  const arc = (v/100)*circ*.75;
  const off = circ*.125;
  const col = score>=80?UP:score>=60?MINT:score>=40?AMBER:DOWN;
  const grade = score>=80?"S":score>=70?"A":score>=60?"B":score>=40?"C":"D";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
      <svg width={132} height={96} viewBox="0 0 132 96" style={{ filter:`drop-shadow(0 0 18px ${col}44)` }}>
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={col} stopOpacity=".45"/>
            <stop offset="100%" stopColor={col}/>
          </linearGradient>
        </defs>
        <path
          d={`M${cx-r*Math.cos(Math.PI*.75)} ${cy+r*Math.sin(Math.PI*.75)} A${r} ${r} 0 1 1 ${cx+r*Math.cos(Math.PI*.75)} ${cy+r*Math.sin(Math.PI*.75)}`}
          fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="9" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#rg)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`} strokeDashoffset={off}
          style={{ transition:"stroke-dasharray .7s cubic-bezier(.16,1,.3,1)" }}
        />
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="28" fontWeight="700" fill={col} fontFamily="JetBrains Mono">{v}</text>
        <text x={cx} y={cy+13} textAnchor="middle" fontSize="9" fill={TEXT3} letterSpacing=".2em">/ 100</text>
        <text x={cx} y={cy+28} textAnchor="middle" fontSize="13" fontWeight="700" fill={col} fontFamily="JetBrains Mono">{grade}</text>
      </svg>
      <span style={{ fontSize:12, fontWeight:700, color:MINT, background:"rgba(94,234,212,.10)", border:"1px solid rgba(94,234,212,.25)", padding:"4px 12px", borderRadius:99, letterSpacing:".04em" }}>
        Lv.3 · コツコツ貯蓄者
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOTTOM BAR
═══════════════════════════════════════════════════════════ */
function BottomBar({ active, onNav }) {
  const items = [
    { id:"home", icon:"⌂", label:"ホーム" },
    { id:"tx",   icon:"≡", label:"取引" },
    { id:"fab",  fab:true },
    { id:"ana",  icon:"◧", label:"分析" },
    { id:"ai",   icon:"◈", label:"AI" },
  ];
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, paddingBottom:24, paddingTop:8,
      background:`linear-gradient(180deg, transparent, rgba(10,10,16,.92) 30%)`, zIndex:10 }}>
      <div style={{ margin:"0 14px", padding:"8px 12px",
        background:"rgba(20,22,32,.88)", backdropFilter:"blur(20px) saturate(160%)",
        border:`1px solid ${BORDERS}`, borderRadius:22,
        display:"flex", alignItems:"center", justifyContent:"space-around",
        boxShadow:"0 8px 32px rgba(0,0,0,.55)" }}>
        {items.map((it,i) => it.fab ? (
          <button key={i} onClick={()=>onNav("tx")}
            aria-label="取引を追加"
            style={{
            width:52, height:52, borderRadius:18,
            background:`linear-gradient(135deg,${MINT},${CYAN})`,
            border:"none", color:"#0a0a10", fontSize:24, fontWeight:300,
            boxShadow:`0 4px 18px ${MINTG}, inset 0 1px 0 rgba(255,255,255,.4)`,
            marginTop:-22,
          }}>＋</button>
        ) : (
          <button key={i} onClick={()=>onNav(it.id)}
            aria-label={it.label}
            aria-current={active===it.id ? "page" : undefined}
            style={{
            background:"none", border:"none", padding:"8px 10px",
            display:"flex", flexDirection:"column", alignItems:"center", gap:3,
            color: active===it.id ? MINT : TEXT3,
            minWidth:48, minHeight:48,
          }}>
            <span style={{ fontSize:20 }}>{it.icon}</span>
            <span style={{ fontSize:11, fontWeight:600 }}>{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SIDEBAR (PC)
═══════════════════════════════════════════════════════════ */
function Sidebar({ active, onNav }) {
  const items = [
    { id:"home", icon:"⌂", label:"ダッシュボード" },
    { id:"tx",   icon:"≡", label:"取引一覧" },
    { id:"cal",  icon:"▦", label:"カレンダー" },
    { id:"budget", icon:"◎", label:"予算管理" },
    { id:"ai",   icon:"◈", label:"AI相談" },
    { id:"notif",icon:"⚑", label:"通知" },
  ];
  return (
    <div style={{ width:220, height:"100vh", position:"fixed", left:0, top:0,
      background:"rgba(8,8,14,.75)", backdropFilter:"blur(24px)", borderRight:`1px solid ${BORDER}`,
      display:"flex", flexDirection:"column", zIndex:40 }}>
      <div style={{ padding:"22px 18px 16px", borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:`linear-gradient(135deg,${MINT},${CYAN})`,
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 18px ${MINTG}` }}>
            <span className="mono" style={{ color:"#0a0a10", fontSize:15, fontWeight:900 }}>K</span>
          </div>
          <div>
            <p className="mono" style={{ fontSize:14, fontWeight:700, color:TEXT, letterSpacing:".04em" }}>KAKEIBO AI</p>
            <p className="mono" style={{ fontSize:11, color:TEXT3, letterSpacing:".06em" }}>v0.1 · BETA</p>
          </div>
        </div>
      </div>
      <nav style={{ padding:10, flex:1 }}>
        {items.map(n=>(
          <button key={n.id} onClick={()=>onNav(n.id)}
            aria-current={active===n.id ? "page" : undefined}
            style={{
            display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
            borderRadius:11, fontSize:14, fontWeight:500, color: active===n.id?MINT:TEXT2,
            background: active===n.id?"rgba(94,234,212,.08)":"transparent",
            border:"none", width:"100%", textAlign:"left", transition:"all .18s",
            position:"relative", minHeight:44,
          }}>
            {active===n.id && <span style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, background:MINT, borderRadius:99, boxShadow:`0 0 12px ${MINTG}` }}/>}
            <span style={{ fontSize:18 }}>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding:14, borderTop:`1px solid ${BORDER}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:`linear-gradient(135deg,rgba(167,139,250,.4),rgba(94,234,212,.3))`,
            display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${BORDERS}` }}>
            <span style={{ fontSize:14, color:TEXT, fontWeight:700 }}>田</span>
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:TEXT }}>田中家</p>
            <p className="mono" style={{ fontSize:11, color:TEXT3, letterSpacing:".04em" }}>2 MEMBERS</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: CALENDAR
   ヒートマップ（支出密度）＋固定費マーカー重ね表示
   日付タップ → スライドアップで取引詳細
═══════════════════════════════════════════════════════════ */
const CAL_FIXED = {
  1:  { label:"家賃",     amt:120000 },
  10: { label:"NETFLIX", amt:1490   },
  25: { label:"電気代",  amt:8400   },
  27: { label:"Spotify", amt:980    },
  28: { label:"Adobe CC",amt:6480   },
};

const CAL_SPEND = {
  1:12000, 2:3200, 3:0,    4:1800, 5:4500,  6:0,    7:2200,
  8:680,   9:8400, 10:3670,11:3000,12:0,    13:3240,14:0,
  15:1200, 16:5800,17:0,   18:2400,19:1800, 20:6200,21:0,
  22:3100, 23:0,   24:4800,25:9200, 26:1600,27:2980,28:7460,
  29:0,    30:3300,31:0,
};

const CAL_TX_BY_DAY = {
  9:  [{ memo:"東京電力 電気料金", cat:"光熱費", amt:-8400, type:"exp" }],
  10: [{ memo:"NETFLIX", cat:"サブスク", amt:-1490, type:"exp" }, { memo:"マツモトキヨシ", cat:"日用品", amt:-2180, type:"exp" }],
  11: [{ memo:"Suica オートチャージ", cat:"交通費", amt:-3000, type:"exp" }],
  12: [{ memo:"STARBUCKS", cat:"外食", amt:-680, type:"exp" }, { memo:"給与振込", cat:"給与", amt:380000, type:"inc" }],
  13: [{ memo:"ライフ 三軒茶屋", cat:"食費", amt:-3240, type:"exp" }],
};

function CalendarScreen() {
  const [selectedDay, setSelectedDay] = useState(null);
  const today = 13;
  const year = 2026, month = 5;
  const firstDow = new Date(year, month-1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxSpend = Math.max(...Object.values(CAL_SPEND));

  // heatmap color: spend → mint opacity
  const heatColor = (day) => {
    const s = CAL_SPEND[day] || 0;
    if (s === 0) return null;
    const intensity = s / maxSpend;
    if (intensity > 0.7) return `rgba(251,113,133,${0.25 + intensity * 0.35})`;  // heavy → red tint
    if (intensity > 0.3) return `rgba(251,191,36,${0.15 + intensity * 0.25})`;   // medium → amber
    return `rgba(94,234,212,${0.10 + intensity * 0.20})`;                         // light → mint
  };

  const weeks = [];
  let cells = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
    if (cells.length === 7) { weeks.push(cells); cells = []; }
  }
  if (cells.length) weeks.push([...cells, ...Array(7 - cells.length).fill(null)]);

  const txToday = selectedDay ? (CAL_TX_BY_DAY[selectedDay] || []) : [];
  const spendToday = selectedDay ? (CAL_SPEND[selectedDay] || 0) : 0;
  const fixedToday = selectedDay ? CAL_FIXED[selectedDay] : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Month header */}
      <Reveal>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
          <div>
            <p className="lbl">カレンダー</p>
            <p style={{ fontSize:24, fontWeight:700, letterSpacing:"-.02em", marginTop:4 }}>
              <span className="mono">2026</span>
              <span style={{ color:TEXT3, fontSize:16, margin:"0 6px" }}>·</span>
              <span>5月</span>
            </p>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ display:"flex", gap:12, fontSize:12, color:TEXT2 }}>
              {[
                { dot:"rgba(94,234,212,.6)",  label:"少" },
                { dot:"rgba(251,191,36,.6)",  label:"中" },
                { dot:"rgba(251,113,133,.6)", label:"多" },
                { dot:"transparent", label:"", border:`1px dashed rgba(167,139,250,.5)`, icon:"◈", color:VIOLET },
              ].map((l,i)=> l.icon ? (
                <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:11, color:l.color }}>{l.icon}</span>
                  <span style={{ color:TEXT3, fontWeight:600 }}>固定費</span>
                </span>
              ) : (
                <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:10, height:10, borderRadius:2, background:l.dot }}/>
                  <span style={{ color:TEXT3, fontWeight:600 }}>{l.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Summary chips */}
      <Reveal delay={60}>
        <div style={{ display:"flex", gap:8 }}>
          {[
            { l:"今月の支出", v:"¥271,700", c:DOWN },
            { l:"固定費合計", v:"¥137,350", c:VIOLET },
            { l:"変動費合計", v:"¥134,350", c:AMBER },
          ].map(({l,v,c},i)=>(
            <div key={i} style={{ flex:1, ...panel, padding:"12px 14px" }}>
              <p className="lbl" style={{ marginBottom:4 }}>{l}</p>
              <p className="mono" style={{ fontSize:15, fontWeight:700, color:c }}>{v}</p>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Calendar grid */}
      <Reveal delay={100}>
        <div style={{ ...panel, padding:16 }}>
          {/* Day of week header */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
            {["日","月","火","水","木","金","土"].map((d,i)=>(
              <div key={i} style={{ textAlign:"center", fontSize:12, fontWeight:700,
                color: i===0?DOWN:i===6?CYAN:TEXT3,
                padding:"6px 0", letterSpacing:".04em" }}>{d}</div>
            ))}
          </div>

          {/* Weeks */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {weeks.map((week,wi)=>(
              <div key={wi} style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
                {week.map((day,di)=>{
                  if (!day) return <div key={di}/>;
                  const heat = heatColor(day);
                  const fixed = CAL_FIXED[day];
                  const isToday = day === today;
                  const isSelected = day === selectedDay;
                  const isSun = di===0, isSat = di===6;
                  return (
                    <button key={di} onClick={()=>setSelectedDay(isSelected?null:day)}
                      aria-label={`5月${day}日${CAL_SPEND[day]?`、支出${CAL_SPEND[day].toLocaleString()}円`:""}${fixed?`、固定費${fixed.label}`:""}${isToday?"、今日":""}`}
                      aria-pressed={isSelected}
                      style={{
                      position:"relative",
                      aspectRatio:"1",
                      borderRadius:10,
                      border: isSelected
                        ? `1.5px solid ${MINT}`
                        : isToday
                        ? `1.5px solid rgba(94,234,212,.5)`
                        : `1px solid ${heat?"rgba(255,255,255,.06)":"transparent"}`,
                      background: isSelected
                        ? "rgba(94,234,212,.15)"
                        : heat || "transparent",
                      boxShadow: isSelected ? `0 0 12px ${MINTG}` : isToday ? `0 0 8px rgba(94,234,212,.2)` : "none",
                      cursor:"pointer",
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      gap:2, padding:2, transition:"all .18s",
                      minHeight:44,
                    }}>
                      <span style={{
                        fontSize:13, fontWeight: isToday?700:500,
                        color: isToday?MINT : isSun?DOWN : isSat?CYAN : TEXT,
                        lineHeight:1,
                        fontFamily: isToday?"JetBrains Mono,monospace":"inherit",
                      }}>{day}</span>
                      {/* spend amount micro — ★ 7px → 9px に拡大 */}
                      {CAL_SPEND[day] > 0 && (
                        <span className="mono" style={{ fontSize:9, color:TEXT3, lineHeight:1, fontWeight:600 }}>
                          {fmtK(CAL_SPEND[day])}
                        </span>
                      )}
                      {/* fixed cost dot */}
                      {fixed && (
                        <span aria-hidden="true" style={{ position:"absolute", top:3, right:3,
                          width:6, height:6, borderRadius:"50%", background:VIOLET,
                          boxShadow:`0 0 4px ${VIOLET}88` }}/>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Upcoming fixed costs */}
      <Reveal delay={160}>
        <div style={{ ...panel, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <p className="lbl">今後の固定費</p>
            <span className="mono" style={{ fontSize:11, color:VIOLET, background:"rgba(167,139,250,.10)", border:"1px solid rgba(167,139,250,.25)", padding:"3px 9px", borderRadius:99, fontWeight:700 }}>5件</span>
          </div>
          {Object.entries(CAL_FIXED)
            .filter(([d])=>Number(d)>=today)
            .map(([d,f],i)=>{
              const daysLeft = Number(d)-today;
              return (
                <div key={d} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0",
                  borderBottom: i<Object.entries(CAL_FIXED).filter(([d])=>Number(d)>=today).length-1?`1px solid ${BORDER}`:"none" }}>
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
                    background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.25)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:VIOLET, fontSize:14, fontFamily:"JetBrains Mono,monospace", fontWeight:700 }}>
                    {d}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:500, color:TEXT }}>{f.label}</p>
                    <p className="mono" style={{ fontSize:12, color:TEXT3, marginTop:2 }}>
                      {daysLeft===0?"今日":daysLeft===1?"明日":`あと${daysLeft}日`}
                    </p>
                  </div>
                  <span className="mono" style={{ fontSize:14, fontWeight:600, color:VIOLET }}>{fmt(f.amt)}</span>
                </div>
              );
            })
          }
        </div>
      </Reveal>

      {/* Slide-up panel */}
      {selectedDay !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:50, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}
          onClick={()=>setSelectedDay(null)}>
          <div style={{ ...panel, borderRadius:"22px 22px 0 0", padding:"6px 0 0",
            background:"rgba(14,16,26,.96)", backdropFilter:"blur(40px) saturate(180%)",
            borderBottom:"none", boxShadow:"0 -8px 40px rgba(0,0,0,.6)",
            animation:"revealUp .32s cubic-bezier(.16,1,.3,1) both",
            maxHeight:"70vh", display:"flex", flexDirection:"column" }}
            onClick={e=>e.stopPropagation()}>
            {/* drag handle */}
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 6px" }}>
              <div style={{ width:36, height:4, borderRadius:99, background:"rgba(255,255,255,.12)" }}/>
            </div>
            {/* header */}
            <div style={{ padding:"8px 22px 14px", borderBottom:`1px solid ${BORDER}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <p className="lbl">5月{selectedDay}日</p>
                  <p className="mono" style={{ fontSize:24, fontWeight:700, color:spendToday>0?DOWN:TEXT3, marginTop:4 }}>
                    {spendToday > 0 ? `-${fmt(spendToday)}` : "支出なし"}
                  </p>
                </div>
                {fixedToday && (
                  <div style={{ ...panel, padding:"10px 14px", borderColor:"rgba(167,139,250,.25)", background:"rgba(167,139,250,.08)" }}>
                    <p className="lbl" style={{ marginBottom:3 }}>固定費</p>
                    <p style={{ fontSize:13, fontWeight:600, color:VIOLET }}>{fixedToday.label}</p>
                    <p className="mono" style={{ fontSize:14, color:VIOLET, marginTop:1 }}>{fmt(fixedToday.amt)}</p>
                  </div>
                )}
              </div>
            </div>
            {/* tx list */}
            <div style={{ overflowY:"auto", padding:"8px 22px 32px" }}>
              {txToday.length === 0 && !fixedToday ? (
                <p style={{ textAlign:"center", color:TEXT3, fontSize:14, padding:"32px 0" }}>この日の取引はありません</p>
              ) : (
                txToday.map((t,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0",
                    borderBottom: i<txToday.length-1?`1px solid ${BORDER}`:"none" }}>
                    <div style={{ width:38, height:38, borderRadius:10,
                      background: t.type==="inc"?"rgba(74,222,128,.10)":"rgba(255,255,255,.04)",
                      border:`1px solid ${t.type==="inc"?"rgba(74,222,128,.25)":BORDER}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      color:t.type==="inc"?UP:TEXT2, fontSize:15, flexShrink:0 }}>
                      {t.type==="inc"?"↑":(CATEGORIES.find(c=>c.name===t.cat)?.icon||"◇")}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:14, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.memo}</p>
                      <p className="mono" style={{ fontSize:12, color:TEXT3, marginTop:2 }}>{t.cat}</p>
                    </div>
                    <span className="mono" style={{ fontSize:15, fontWeight:600, color:t.type==="inc"?UP:TEXT }}>
                      {t.type==="inc"?"+":""}{fmt(t.amt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TICKER — ★ WCAG 2.2.2 準拠：一時停止ボタン追加、文字サイズ拡大
═══════════════════════════════════════════════════════════ */
function Ticker() {
  const [paused, setPaused] = useState(false);
  const items = [
    { l:"INCOME",  v:"¥380,000",  c:UP },
    { l:"EXPENSE", v:"¥271,700",  c:DOWN },
    { l:"BALANCE", v:"+¥108,300", c:MINT },
    { l:"SCORE",   v:"73 / B",    c:MINT },
    { l:"LEVEL",   v:"LV.3 · 428PT", c:VIOLET },
    { l:"ALERTS",  v:"2 OVER BUDGET", c:DOWN },
    { l:"SUBS",    v:"3 REVIEW",  c:AMBER },
  ];
  const rep = [...items,...items];
  return (
    <div style={{ position:"relative", overflow:"hidden", borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`,
      background:"rgba(0,0,0,.2)", whiteSpace:"nowrap" }}>
      <div className="ticker-track" style={{ display:"inline-block",
        animation:"ticker 40s linear infinite",
        animationPlayState: paused ? "paused" : "running" }}>
        {rep.map((t,i)=>(
          <span key={i} style={{ display:"inline-block", padding:"10px 24px", fontSize:12, fontFamily:"JetBrains Mono,monospace",
            color:TEXT2, letterSpacing:".04em" }}>
            <span style={{ color:TEXT3, marginRight:6 }}>{t.l}</span>
            <span style={{ color:t.c, fontWeight:600 }}>{t.v}</span>
            <span style={{ color:TEXT3, margin:"0 12px" }}>·</span>
          </span>
        ))}
      </div>
      {/* ★ 一時停止ボタン — WCAG 2.2.2 Level A 必須 */}
      <button onClick={()=>setPaused(p=>!p)}
        aria-label={paused ? "ティッカーを再生" : "ティッカーを一時停止"}
        aria-pressed={paused}
        style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
          width:32, height:32, borderRadius:8,
          background:"rgba(20,22,32,.92)", border:`1px solid ${BORDERS}`,
          color:TEXT2, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center",
          backdropFilter:"blur(20px)", zIndex:2 }}>
        {paused ? "▶" : "⏸"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: DASHBOARD
═══════════════════════════════════════════════════════════ */
const DASH_TABS = ["NOW","ANALYTICS","STRATEGY"];

function DashHome() {
  const balance = useCountUp(108300);
  const expense = useCountUp(271700);
  const alerts = CATEGORIES.filter(c=>c.value>c.budget);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

      {/* Hero balance card — v1-neo style */}
      <Reveal>
        <div style={{ ...panel, padding:22,
          background:`linear-gradient(135deg,rgba(94,234,212,.10),${PANEL})`,
          borderColor:"rgba(94,234,212,.22)" }}>
          <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%",
            background:`radial-gradient(circle,${MINTG},transparent 70%)`, filter:"blur(20px)" }}/>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <p className="lbl">今月の収支</p>
            <span className="mono" style={{ fontSize:12, color:UP, padding:"4px 10px", borderRadius:99,
              background:"rgba(74,222,128,.10)", border:"1px solid rgba(74,222,128,.25)" }}>▲ +¥12,300</span>
          </div>
          <p className="mono" style={{ fontSize:44, fontWeight:700, color:MINT, marginTop:10,
            textShadow:`0 0 32px ${MINTG}`, lineHeight:1, letterSpacing:"-.02em" }}>
            +¥{balance.toLocaleString()}
          </p>
          <div style={{ display:"flex", gap:20, marginTop:14, fontSize:13, color:TEXT2 }}>
            <span><span style={{ color:TEXT3 }}>収入　</span><span className="mono">¥380,000</span></span>
            <span><span style={{ color:TEXT3 }}>支出　</span><span className="mono">¥{expense.toLocaleString()}</span></span>
          </div>
          {/* mini sparkline */}
          <div style={{ marginTop:12 }}>
            <Spark data={MONTHLY.map(m=>m.exp)} w={220} h={32} stroke={MINT} />
          </div>
        </div>
      </Reveal>

      {/* KPI 2-col */}
      <Reveal delay={80}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ ...panel, padding:16 }}>
            <p className="lbl">支出 vs 予算</p>
            <p className="mono" style={{ fontSize:24, fontWeight:700, marginTop:6 }}>89<span style={{ fontSize:14, color:TEXT3 }}>%</span></p>
            <div style={{ height:6, background:"rgba(255,255,255,.05)", borderRadius:99, marginTop:8, overflow:"hidden" }}>
              <div style={{ width:"89%", height:"100%", background:MINT, boxShadow:`0 0 8px ${MINTG}`,
                transformOrigin:"left", animation:"growBar 1.2s cubic-bezier(.16,1,.3,1) both" }}/>
            </div>
          </div>
          <div style={{ ...panel, padding:16 }}>
            <p className="lbl">スコア</p>
            <div style={{ display:"flex", alignItems:"baseline", gap:4, marginTop:6 }}>
              <p className="mono" style={{ fontSize:24, fontWeight:700 }}>73</p>
              <span className="mono" style={{ fontSize:12, color:DOWN }}>▼8</span>
            </div>
            <div style={{ display:"flex", gap:2, marginTop:8 }}>
              {[58,62,75,48,81,73].map((s,i)=>(
                <div key={i} style={{ flex:1, height:6, borderRadius:1,
                  background: i===5?MINT:"rgba(255,255,255,.08)", opacity: i===5?1:0.4+(s/100)*0.4 }}/>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* AI insight card */}
      <Reveal delay={140}>
        <div style={{ ...panel, padding:16,
          background:`linear-gradient(135deg,rgba(167,139,250,.10),${PANEL})`,
          borderColor:"rgba(167,139,250,.18)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ width:24, height:24, borderRadius:7,
              background:`linear-gradient(135deg,${VIOLET},${MINT})`,
              display:"inline-flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:900, color:"#0a0a10" }}>AI</span>
            <span style={{ fontSize:13, fontWeight:700, color:VIOLET }}>今日のひとこと</span>
            <LiveDot />
          </div>
          <p style={{ fontSize:14, lineHeight:1.75, color:TEXT2 }}>
            先月より <span className="mono" style={{ color:UP, fontWeight:600 }}>¥26,300</span> 支出が減りました。外食だけは
            <span className="mono" style={{ color:DOWN, fontWeight:600 }}> +21% </span>
            と増加傾向。今週は自炊3回でクエスト達成です。
          </p>
          <button style={{ marginTop:10, padding:"10px 14px", fontSize:13, color:VIOLET,
            background:"rgba(167,139,250,.08)", border:`1px solid rgba(167,139,250,.25)`,
            borderRadius:8, fontWeight:600, minHeight:40 }}>もっと話す →</button>
        </div>
      </Reveal>

      {/* Category bars — top 4 */}
      <Reveal delay={200}>
        <div style={{ ...panel, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p className="lbl">カテゴリ別</p>
            {alerts.length>0 && <span className="mono" style={{ fontSize:11, color:DOWN, background:"rgba(251,113,133,.10)", border:"1px solid rgba(251,113,133,.25)", padding:"3px 9px", borderRadius:99, fontWeight:700 }}>⚠ {alerts.length}件超過</span>}
          </div>
          {CATEGORIES.slice(0,4).map((c,i)=>{
            const pct=Math.round(c.value/c.budget*100);
            const over=pct>100;
            return (
              <div key={i} style={{ marginBottom: i<3?12:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5 }}>
                  <span style={{ fontSize:14, color:TEXT, fontWeight:500 }}>{c.name}</span>
                  <span className="mono" style={{ fontSize:13, color:over?DOWN:TEXT2 }}>
                    {fmt(c.value)} <span style={{ color:TEXT3 }}>/ {fmt(c.budget)}</span>
                  </span>
                </div>
                <div style={{ height:6, background:"rgba(255,255,255,.05)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:over?DOWN:c.color,
                    boxShadow:`0 0 8px ${over?DOWN:c.color}66`,
                    transformOrigin:"left", animation:`growBar 1.2s ${.1+i*.08}s cubic-bezier(.16,1,.3,1) both` }}/>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* Streak card */}
      <Reveal delay={260}>
        <div style={{ ...panel, padding:16,
          background:`linear-gradient(135deg,rgba(251,191,36,.10),${PANEL})`,
          borderColor:"rgba(251,191,36,.22)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p className="lbl">連続記録</p>
              <p className="mono" style={{ fontSize:30, fontWeight:700, color:AMBER, marginTop:4,
                textShadow:"0 0 20px rgba(251,191,36,.32)" }}>
                7<span style={{ fontSize:15, color:TEXT2, marginLeft:4 }}>日</span>
              </p>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              {[1,1,1,1,1,1,1,0].map((on,i)=>(
                <div key={i} style={{ width:18, height:28, borderRadius:4,
                  background: on?AMBER:"rgba(255,255,255,.05)",
                  boxShadow: on?"0 0 8px rgba(251,191,36,.4)":"none",
                  border: on?"none":`1px dashed rgba(255,255,255,.10)` }}/>
              ))}
            </div>
          </div>
          <p style={{ fontSize:13, color:TEXT3, marginTop:8 }}>
            あと <span className="mono" style={{ color:AMBER, fontWeight:600 }}>1日</span> で「コツコツ8日連続」バッジ獲得
          </p>
        </div>
      </Reveal>
    </div>
  );
}

function DashAnalytics() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Reveal>
        <div style={{ ...panel, padding:18 }}>
          <p className="lbl" style={{ marginBottom:14 }}>収支トレンド · 6M</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={MONTHLY}>
              <defs>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={UP} stopOpacity={.35}/>
                  <stop offset="100%" stopColor={UP} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DOWN} stopOpacity={.35}/>
                  <stop offset="100%" stopColor={DOWN} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fontSize:10, fill:TEXT3, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:9, fill:TEXT3, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/10000).toFixed(0)}万`} width={34}/>
              <Tooltip content={<TooltipDark/>}/>
              <Area type="monotone" dataKey="inc" name="収入" stroke={UP} strokeWidth={2} fill="url(#gI)" dot={false}/>
              <Area type="monotone" dataKey="exp" name="支出" stroke={DOWN} strokeWidth={2} fill="url(#gE)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:10 }}>
          <div style={{ ...panel, padding:16 }}>
            <p className="lbl" style={{ marginBottom:12 }}>支出ランキング</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[...CATEGORIES].sort((a,b)=>b.value-a.value).slice(0,6)} layout="vertical" margin={{ left:0 }}>
                <XAxis type="number" hide/>
                <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:TEXT2 }} axisLine={false} tickLine={false} width={50}/>
                <Tooltip content={<TooltipDark/>} cursor={{ fill:"rgba(255,255,255,.03)" }}/>
                <Bar dataKey="value" name="支出" radius={[0,4,4,0]}>
                  {[...CATEGORIES].sort((a,b)=>b.value-a.value).slice(0,6).map((c,i)=>(
                    <Cell key={i} fill={c.color} opacity={i===0?1:.65}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...panel, padding:16 }}>
            <p className="lbl" style={{ marginBottom:12 }}>先月比</p>
            {MOM.map((m,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"11px 0", borderBottom: i<4?`1px solid ${BORDER}`:"none" }}>
                <span style={{ fontSize:13, color:TEXT2 }}>{m.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span className="mono" style={{ fontSize:13, fontWeight:600, color:m.diff>0?DOWN:UP }}>
                    {m.diff>0?"+":""}{fmt(m.diff)}
                  </span>
                  <span className="mono" style={{ fontSize:11, padding:"3px 7px", borderRadius:99,
                    background: m.diff>0?"rgba(251,113,133,.12)":"rgba(74,222,128,.12)",
                    color: m.diff>0?DOWN:UP, border:`1px solid ${m.diff>0?"rgba(251,113,133,.25)":"rgba(74,222,128,.25)"}`, fontWeight:600 }}>
                    {m.diff>0?"▲":"▼"}{Math.abs(m.pct)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div style={{ ...panel, padding:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <p className="lbl">サブスク 見直し候補</p>
            <span className="mono" style={{ fontSize:11, color:AMBER, background:"rgba(251,191,36,.10)", border:"1px solid rgba(251,191,36,.25)", padding:"3px 9px", borderRadius:99, fontWeight:700 }}>3 ITEMS</span>
          </div>
          {[
            { name:"Adobe Creative Cloud", amt:6480, months:8 },
            { name:"Amazon Prime", amt:600, months:12 },
            { name:"Spotify Premium", amt:980, months:6 },
          ].map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 0", borderBottom: i<2?`1px solid ${BORDER}`:"none" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10,
                  background:"rgba(94,234,212,.06)", border:"1px solid rgba(94,234,212,.18)",
                  display:"flex", alignItems:"center", justifyContent:"center", color:MINT, fontSize:15 }}>◈</div>
                <div>
                  <p style={{ fontSize:14, fontWeight:500, color:TEXT }}>{s.name}</p>
                  <p className="mono" style={{ fontSize:11, color:TEXT3, marginTop:2 }}>{s.months}M · {fmt(s.amt)}/MO</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={{ padding:"8px 14px", fontSize:12, fontWeight:600, borderRadius:8,
                  background:"rgba(251,191,36,.10)", color:AMBER, border:"1px solid rgba(251,191,36,.25)", minHeight:36 }}>見直し</button>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

function DashStrategy() {
  const lvPct = ((428-300)/(600-300))*100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Reveal>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div style={{ ...panel, padding:18, display:"flex", flexDirection:"column", alignItems:"center" }}>
            <p className="lbl" style={{ alignSelf:"flex-start", marginBottom:12 }}>今月のスコア</p>
            <ScoreRing score={73}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, width:"100%", marginTop:14 }}>
              {[["予算達成",43,MINT],["節約行動",21,UP],["ボーナス",9,AMBER]].map(([l,v,c],i)=>(
                <div key={i} style={{ textAlign:"center", padding:"10px 4px", background:"rgba(255,255,255,.02)", borderRadius:9, border:`1px solid ${BORDER}` }}>
                  <p className="mono" style={{ fontSize:18, fontWeight:700, color:c }}>{v}</p>
                  <p style={{ fontSize:11, color:TEXT3, marginTop:3, fontWeight:600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...panel, padding:18 }}>
            <p className="lbl" style={{ marginBottom:16 }}>累積レベル</p>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"6px 0" }}>
              <div style={{ width:62, height:62, borderRadius:"50%",
                background:"conic-gradient(from 0deg,#5eead4,#a78bfa,#22d3ee,#5eead4)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 0 28px ${MINTG}`, marginBottom:12 }}>
                <div style={{ width:54, height:54, borderRadius:"50%", background:BG,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span className="mono" style={{ fontSize:28, fontWeight:800, color:MINT, textShadow:`0 0 16px ${MINTG}` }}>3</span>
                </div>
              </div>
              <p style={{ fontSize:14, fontWeight:700, color:TEXT }}>コツコツ貯蓄者</p>
              <p className="mono" style={{ fontSize:12, color:TEXT3, marginTop:3 }}>累積 428 pt</p>
            </div>
            <div style={{ marginTop:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:TEXT3, marginBottom:5, fontFamily:"JetBrains Mono", fontWeight:600 }}>
                <span>LV.3</span><span>NEXT 172pt</span>
              </div>
              <div style={{ height:6, background:"rgba(255,255,255,.04)", borderRadius:99, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${lvPct}%`, background:`linear-gradient(90deg,${MINT},${CYAN})`,
                  borderRadius:99, boxShadow:`0 0 10px ${MINTG}`, transition:"width 1.2s cubic-bezier(.16,1,.3,1)" }}/>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div style={{ ...panel, padding:16 }}>
          <p className="lbl" style={{ marginBottom:12 }}>スコア推移</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={SCORE_HIST}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={MINT}/>
                  <stop offset="100%" stopColor={CYAN}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fontSize:10, fill:TEXT3, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{ fontSize:9, fill:TEXT3, fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} width={22}/>
              <Tooltip content={<TooltipDark/>}/>
              <ReferenceLine y={60} stroke="rgba(255,255,255,.07)" strokeDasharray="4 4"/>
              <Line type="monotone" dataKey="s" name="スコア" stroke="url(#sg)" strokeWidth={2.5}
                dot={{ fill:MINT, r:4, strokeWidth:0 }} activeDot={{ r:6, fill:MINT, strokeWidth:0 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      <Reveal delay={140}>
        <div style={{ ...panel, padding:16, background:`linear-gradient(135deg,rgba(94,234,212,.07),${PANEL})`, borderColor:"rgba(94,234,212,.18)" }}>
          <div style={{ display:"flex", gap:12 }}>
            <div style={{ width:34, height:34, borderRadius:10,
              background:`linear-gradient(135deg,${MINT},${CYAN})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, boxShadow:`0 0 16px ${MINTG}` }}>
              <span className="mono" style={{ color:"#0a0a10", fontSize:10, fontWeight:900 }}>AI</span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                <p className="mono" style={{ fontSize:12, fontWeight:700, color:MINT }}>2026.05 SUMMARY</p>
                <LiveDot color={MINT}/>
              </div>
              <p style={{ fontSize:14, lineHeight:1.75, color:TEXT2 }}>
                外食費が先月比 <span className="mono" style={{ color:DOWN, fontWeight:600 }}>+21%</span> 増加。食費は <span className="mono" style={{ color:UP, fontWeight:600 }}>−8%</span> と好調。Adobe CC（8M連続）の見直しで月 <span className="mono" style={{ color:MINT, fontWeight:600 }}>¥6,480</span> の節約余地。スコア <span className="mono" style={{ color:MINT, fontWeight:600 }}>73 pt</span>、前月比 −8。
              </p>
            </div>
          </div>
          <button style={{ marginTop:12, width:"100%", padding:"12px 0", fontSize:13, fontWeight:600,
            background:"rgba(255,255,255,.03)", border:`1px solid ${BORDER}`, borderRadius:10, color:TEXT2, minHeight:44 }}>
            ⟲ サマリーを再生成
          </button>
        </div>
      </Reveal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: TRANSACTIONS — date-grouped (v1-neo style)
═══════════════════════════════════════════════════════════ */
function TxScreen() {
  const [filter, setFilter] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const chips = ["すべて","支出","収入","固定","⚠ 超過"];

  const groups = [
    { date:"今日 · 5月13日",  total:-3240,         items:[TX[0]] },
    { date:"昨日 · 5月12日",  total:-680+380000,   items:[TX[1],TX[2]] },
    { date:"5月11日 · 月",    total:-3000,          items:[TX[3]] },
    { date:"5月10日 · 日",    total:-3670,          items:[TX[4],TX[5]] },
    { date:"5月09日 · 土",    total:-8400,          items:[TX[6]] },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      {/* header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:12, padding:3 }}>
          {["04月","05月"].map((m,i)=>(
            <button key={i}
              aria-pressed={i===1}
              style={{ padding:"10px 18px", borderRadius:9, fontSize:13, fontWeight:500, border:"none",
              background: i===1?"rgba(94,234,212,.12)":"transparent",
              color: i===1?MINT:TEXT3,
              boxShadow: i===1?`0 0 8px ${MINTG}`:"none", minHeight:40 }}>{m}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowModal(true)}
            aria-label="取引を追加"
            style={{ padding:"11px 18px", fontSize:13, fontWeight:700,
            background:`linear-gradient(135deg,${MINT},${CYAN})`, color:"#0a0a10", border:"none",
            borderRadius:10, boxShadow:`0 4px 18px ${MINTG}`, minHeight:44 }}>＋ 追加</button>
          <button aria-label="CSVをインポート"
            style={{ padding:"11px 16px", fontSize:13, fontWeight:500,
            background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:10, color:TEXT2, minHeight:44 }}>CSV</button>
        </div>
      </div>

      {/* chips */}
      <div style={{ display:"flex", gap:6, marginBottom:14, overflow:"auto" }}>
        {chips.map((l,i)=>(
          <button key={i} onClick={()=>setFilter(i)}
            aria-pressed={filter===i}
            style={{ padding:"9px 14px", fontSize:13, fontWeight:600,
            borderRadius:99, whiteSpace:"nowrap",
            background: filter===i?"rgba(94,234,212,.12)":"rgba(255,255,255,.03)",
            border:`1px solid ${filter===i?"rgba(94,234,212,.30)":BORDER}`,
            color: filter===i?MINT:TEXT2, minHeight:38 }}>{l}</button>
        ))}
      </div>

      {/* date-grouped rows — v1-neo style */}
      {groups.map((g,gi)=>(
        <Reveal key={gi} delay={gi*50}>
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 4px" }}>
              <p style={{ fontSize:12, color:TEXT3, fontWeight:700, letterSpacing:".04em" }}>{g.date}</p>
              <p className="mono" style={{ fontSize:12, color:g.total>=0?UP:TEXT3, fontWeight:600 }}>
                {g.total>=0?"+":""}{fmt(g.total)}
              </p>
            </div>
            <div style={{ ...panel, padding:"4px 12px" }}>
              {g.items.map((t,i)=>(
                <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 4px",
                  borderBottom: i<g.items.length-1?`1px solid ${BORDER}`:"none",
                  cursor:"pointer", transition:"background .15s", borderRadius:8, minHeight:48 }}>
                  <div style={{ width:36, height:36, borderRadius:11, flexShrink:0,
                    background: t.type==="inc"?"rgba(74,222,128,.10)":"rgba(255,255,255,.04)",
                    border:`1px solid ${t.type==="inc"?"rgba(74,222,128,.25)":BORDER}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color: t.type==="inc"?UP:TEXT2, fontSize:15 }}>
                    {t.type==="inc"?"↑":(CATEGORIES.find(c=>c.name===t.cat)?.icon||"◇")}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.memo}</p>
                    <p className="mono" style={{ fontSize:12, color:TEXT3, marginTop:2 }}>{t.time} · {t.cat}</p>
                  </div>
                  <span className="mono" style={{ fontSize:15, fontWeight:600, color:t.type==="inc"?UP:TEXT }}>
                    {t.type==="inc"?"+":""}{fmt(t.amt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      ))}

      {/* MODAL */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:60, padding:16,
          animation:"fadeIn .2s ease" }} onClick={()=>setShowModal(false)}>
          <div style={{ ...panel, borderRadius:22, width:"100%", maxWidth:430, padding:26,
            boxShadow:"0 24px 64px rgba(0,0,0,.6)", animation:"revealUp .3s cubic-bezier(.16,1,.3,1) both" }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <p style={{ fontSize:17, fontWeight:700, color:TEXT }}>取引を追加</p>
              <button onClick={()=>setShowModal(false)}
                aria-label="閉じる"
                style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${BORDER}`, borderRadius:"50%", width:40, height:40, color:TEXT2, fontSize:15 }}>✕</button>
            </div>
            <div style={{ display:"flex", gap:4, background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:12, padding:3, marginBottom:20 }}>
              {[{l:"✏ テキスト",v:false},{l:"🎤 音声",v:true}].map((m,i)=>(
                <button key={i} onClick={()=>setVoiceMode(m.v)}
                  aria-pressed={voiceMode===m.v}
                  style={{ flex:1, padding:"10px 0", borderRadius:9, fontSize:13, fontWeight:500, border:"none",
                  background: voiceMode===m.v?"rgba(94,234,212,.12)":"transparent",
                  color: voiceMode===m.v?MINT:TEXT3,
                  boxShadow: voiceMode===m.v?`0 0 8px ${MINTG}`:"none", minHeight:40 }}>{m.l}</button>
              ))}
            </div>
            {!voiceMode ? (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[["金額","0","number"],["メモ","スタバ、電気代…","text"]].map(([l,ph,t])=>(
                  <div key={l}>
                    <p className="lbl" style={{ marginBottom:6 }}>{l}</p>
                    <input type={t} placeholder={ph}
                      aria-label={l}
                      style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px 14px", fontSize: l==="金額"?22:16, fontWeight: l==="金額"?700:400, color:TEXT, outline:"none", fontFamily: l==="金額"?"JetBrains Mono,monospace":"inherit" }}/>
                  </div>
                ))}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[["種類"],["日付"]].map(([l],i)=>(
                    <div key={l}>
                      <p className="lbl" style={{ marginBottom:6 }}>{l}</p>
                      {i===0 ? (
                        <select aria-label={l} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px 12px", fontSize:16, color:TEXT, outline:"none", minHeight:44 }}>
                          <option>支出</option><option>収入</option>
                        </select>
                      ) : (
                        <input type="date" aria-label={l} style={{ width:"100%", background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:10, padding:"12px 12px", fontSize:16, color:TEXT, outline:"none", minHeight:44 }}/>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button onClick={()=>setShowModal(false)} style={{ flex:1, padding:"14px 0", fontSize:14, fontWeight:700,
                    background:`linear-gradient(135deg,${MINT},${CYAN})`, color:"#0a0a10", border:"none", borderRadius:12,
                    boxShadow:`0 4px 20px ${MINTG}`, minHeight:48 }}>登録する</button>
                  <button onClick={()=>setShowModal(false)} style={{ padding:"14px 20px", fontSize:14, fontWeight:500,
                    background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:12, color:TEXT2, minHeight:48 }}>キャンセル</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"12px 0" }}>
                <button onClick={()=>setRecording(!recording)}
                  aria-label={recording?"録音を停止":"録音を開始"}
                  aria-pressed={recording}
                  style={{
                  position:"relative", width:76, height:76, borderRadius:"50%", margin:"0 auto 18px",
                  background: recording?`linear-gradient(135deg,${DOWN},${AMBER})`:`linear-gradient(135deg,${MINT},${CYAN})`,
                  border:"none", fontSize:28, color: recording?"#fff":"#0a0a10",
                  boxShadow: recording?`0 0 32px rgba(251,113,133,.45)`:`0 0 32px ${MINTG}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  animation: recording?"revealUp .2s ease":"none",
                }}>
                  {recording && <span style={{ position:"absolute", inset:-10, borderRadius:"50%", border:`2px solid ${DOWN}`, animation:"ringPulse .9s ease-out infinite" }}/>}
                  🎤
                </button>
                <p style={{ fontSize:14, color:TEXT, fontWeight:500, marginBottom:6 }}>{recording?"録音中 — 話してください":"タップして音声入力"}</p>
                <p className="mono" style={{ fontSize:12, color:TEXT3 }}>「スタバで680円」「昨日交通費1200円」</p>
                {recording && (
                  <div style={{ marginTop:16, background:"rgba(255,255,255,.03)", border:`1px solid ${BORDER}`, borderRadius:12, padding:"14px 16px", textAlign:"left" }}>
                    <p className="mono" style={{ fontSize:11, color:TEXT3, marginBottom:6, letterSpacing:".12em", fontWeight:700 }}>TRANSCRIPT</p>
                    <p style={{ fontSize:14, color:TEXT, fontWeight:500 }}>スタバで 680 円…</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:10 }}>
                      {[["AMOUNT","¥680"],["MEMO","スタバ"],["CAT","外食"]].map(([l,v])=>(
                        <div key={l} style={{ background:"rgba(255,255,255,.04)", borderRadius:8, padding:"10px 10px", border:`1px solid ${BORDER}` }}>
                          <p className="mono" style={{ fontSize:11, color:TEXT3, marginBottom:3, letterSpacing:".1em", fontWeight:700 }}>{l}</p>
                          <p style={{ fontSize:13, fontWeight:600, color:MINT }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: NOTIFICATIONS — v1-neo style
═══════════════════════════════════════════════════════════ */
function NotifScreen() {
  const levelColor = { warn:DOWN, info:VIOLET, good:UP, neutral:TEXT2 };
  const [filter,setFilter] = useState(0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
      <Reveal>
        <div style={{ marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <p style={{ fontSize:26, fontWeight:700, letterSpacing:"-.02em" }}>5件の新着</p>
              <p style={{ fontSize:13, color:TEXT3, marginTop:4 }}>うち 1件はアラート · 2件はAIからの提案</p>
            </div>
            <button style={{ padding:"10px 14px", fontSize:13, fontWeight:600, color:MINT,
              background:"rgba(94,234,212,.08)", border:"1px solid rgba(94,234,212,.25)", borderRadius:8, minHeight:40 }}>
              すべて既読
            </button>
          </div>
          <div style={{ display:"flex", gap:6, overflow:"auto" }}>
            {[["すべて",5],["AI",2],["アラート",1],["達成",1]].map(([l,n],i)=>(
              <button key={i} onClick={()=>setFilter(i)}
                aria-pressed={filter===i}
                style={{ padding:"9px 14px", fontSize:13, fontWeight:600,
                borderRadius:99, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5,
                background: filter===i?"rgba(94,234,212,.12)":"rgba(255,255,255,.03)",
                border:`1px solid ${filter===i?"rgba(94,234,212,.30)":BORDER}`,
                color: filter===i?MINT:TEXT2, minHeight:38 }}>
                {l}
                <span className="mono" style={{ fontSize:11, opacity:.7, fontWeight:700 }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </Reveal>

      {ALERTS.map((a,i)=>{
        const c = levelColor[a.level];
        return (
          <Reveal key={a.id} delay={i*50}>
            <div style={{ ...panel, padding:16, marginBottom:10,
              borderLeft:`3px solid ${c}`,
              background: a.level==="warn" ? `linear-gradient(90deg,rgba(251,113,133,.10),${PANEL})`
                        : a.level==="info" ? `linear-gradient(90deg,rgba(167,139,250,.08),${PANEL})`
                        : a.level==="good" ? `linear-gradient(90deg,rgba(74,222,128,.08),${PANEL})`
                        : PANEL }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:9, flexShrink:0,
                  background:`${c}1A`, border:`1px solid ${c}40`,
                  color:c, fontSize:13, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"JetBrains Mono,monospace" }}>{a.icon}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8 }}>
                    <p style={{ fontSize:14, fontWeight:600 }}>{a.title}</p>
                    <span className="mono" style={{ fontSize:11, color:TEXT3, flexShrink:0 }}>{a.time}</span>
                  </div>
                  <p style={{ fontSize:13, color:TEXT2, marginTop:4, lineHeight:1.6 }}>{a.body}</p>
                  {a.kind==="ai" && (
                    <div style={{ display:"flex", gap:6, marginTop:10 }}>
                      <button style={{ padding:"8px 12px", fontSize:12, fontWeight:600,
                        background:`${c}22`, color:c, border:`1px solid ${c}40`, borderRadius:7, minHeight:36 }}>詳細を見る</button>
                      <button style={{ padding:"8px 12px", fontSize:12, fontWeight:500,
                        background:"transparent", color:TEXT3, border:`1px solid ${BORDER}`, borderRadius:7, minHeight:36 }}>後で</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: BUDGET
═══════════════════════════════════════════════════════════ */
function BudgetScreen() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <Reveal>
        <div style={{ ...panel, padding:20 }}>
          <p className="lbl" style={{ marginBottom:16 }}>カテゴリ別 予算設定</p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {CATEGORIES.map((c,i)=>{
              const pct=Math.round(c.value/c.budget*100);
              const over=pct>100;
              return (
                <div key={i} style={{ padding:14, borderRadius:12,
                  border:`1px solid ${over?"rgba(251,113,133,.25)":BORDER}`,
                  background: over?"rgba(251,113,133,.04)":"rgba(255,255,255,.02)" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:c.color, boxShadow:`0 0 8px ${c.color}88` }}/>
                      <span style={{ fontSize:14, fontWeight:500, color:over?DOWN:TEXT }}>{c.name}</span>
                      {over && <span className="mono" style={{ fontSize:11, color:DOWN, background:"rgba(251,113,133,.12)", border:"1px solid rgba(251,113,133,.25)", padding:"3px 8px", borderRadius:99, fontWeight:700 }}>OVER</span>}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span className="mono" style={{ fontSize:13, color:TEXT3 }}>{fmt(c.value)} /</span>
                      <input defaultValue={c.budget} aria-label={`${c.name}の予算`} className="mono" style={{ width:90, textAlign:"right", fontSize:14, fontWeight:600, border:`1px solid ${BORDER}`, borderRadius:7, padding:"7px 10px", background:"rgba(255,255,255,.04)", color:TEXT, outline:"none", minHeight:36 }}/>
                      <span className="mono" style={{ fontSize:13, color:TEXT3 }}>円</span>
                    </div>
                  </div>
                  <div style={{ height:6, background:"rgba(255,255,255,.05)", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:over?DOWN:c.color,
                      boxShadow:`0 0 8px ${over?DOWN:c.color}66`,
                      transformOrigin:"left", animation:`growBar 1s ${.05*i}s cubic-bezier(.16,1,.3,1) both` }}/>
                  </div>
                  <p className="mono" style={{ fontSize:12, color:over?DOWN:TEXT3, marginTop:6, textAlign:"right", fontWeight:over?700:500 }}>
                    {over?`+ ¥${(c.value-c.budget).toLocaleString()} OVER`:`REMAINING ¥${(c.budget-c.value).toLocaleString()}`}
                  </p>
                </div>
              );
            })}
          </div>
          <button style={{ marginTop:16, width:"100%", padding:"14px 0", fontSize:14, fontWeight:700,
            background:`linear-gradient(135deg,${MINT},${CYAN})`, color:"#0a0a10", border:"none", borderRadius:12,
            boxShadow:`0 4px 20px ${MINTG}`, minHeight:48 }}>予算を保存する</button>
        </div>
      </Reveal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCREEN: AI CHAT
═══════════════════════════════════════════════════════════ */
function AIChatScreen() {
  const [msgs,setMsgs] = useState([
    { role:"ai", text:"今月のデータを確認しました。外食費が先月比+21%と増加傾向にあります。Adobe CCのサブスクは8ヶ月連続で、見直しで月¥6,480の節約余地があります。何かご相談はありますか？" }
  ]);
  const [input,setInput] = useState("");
  const endRef = useRef(null);
  const presets = ["節約アドバイスが欲しい","サブスクを整理したい","来月の予算を立てたい","固定費を減らすには"];

  const send = useCallback(()=>{
    if(!input.trim()) return;
    setMsgs(p=>[...p,{role:"user",text:input},{role:"ai",text:"データを分析しています…"}]);
    setInput("");
  },[input]);

  useEffect(()=>endRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 180px)", minHeight:460 }}>
      <Reveal>
        <div style={{ ...panel, padding:"12px 16px", marginBottom:12, flexShrink:0,
          background:`linear-gradient(135deg,rgba(94,234,212,.08),${PANEL})`, borderColor:"rgba(94,234,212,.18)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <LiveDot color={MINT}/>
            <p className="mono" style={{ fontSize:11, fontWeight:700, color:MINT, letterSpacing:".12em" }}>CONTEXT: 2026.05 — LIVE</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[["EXPENSE","¥271,700",DOWN],["BUDGET","6 / 8",MINT],["SCORE","73 pt",MINT]].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:"center" }}>
                <p className="mono" style={{ fontSize:16, fontWeight:700, color:c }}>{v}</p>
                <p className="mono" style={{ fontSize:11, color:TEXT3, marginTop:2, letterSpacing:".08em", fontWeight:700 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:10 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"revealUp .4s cubic-bezier(.16,1,.3,1) both" }}>
            {m.role==="ai" && (
              <div style={{ width:34, height:34, borderRadius:9,
                background:`linear-gradient(135deg,${MINT},${CYAN})`,
                display:"flex", alignItems:"center", justifyContent:"center",
                marginRight:8, flexShrink:0, marginTop:2, boxShadow:`0 0 14px ${MINTG}` }}>
                <span className="mono" style={{ fontSize:11, fontWeight:900, color:"#0a0a10" }}>AI</span>
              </div>
            )}
            <div style={{
              maxWidth:"76%", padding:"12px 16px", fontSize:14, lineHeight:1.7,
              ...( m.role==="ai"
                ? { background:PANEL, backdropFilter:"blur(20px)", border:`1px solid ${BORDER}`, color:TEXT, borderRadius:"14px 14px 14px 4px" }
                : { background:`linear-gradient(135deg,rgba(94,234,212,.18),rgba(34,211,238,.14))`, border:"1px solid rgba(94,234,212,.22)", color:TEXT, borderRadius:"14px 14px 4px 14px" }
              )
            }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef}/>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2, flexShrink:0 }}>
        {presets.map((p,i)=>(
          <button key={i} onClick={()=>setInput(p)} style={{ fontSize:13, padding:"8px 14px", borderRadius:99,
            border:`1px solid ${BORDER}`, background:PANEL, backdropFilter:"blur(20px)",
            color:TEXT2, whiteSpace:"nowrap", flexShrink:0, fontWeight:500, transition:"all .2s", minHeight:36 }}>
            {p}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          aria-label="メッセージを入力"
          placeholder="家計について相談する…" style={{ flex:1, background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`,
            borderRadius:12, padding:"13px 16px", fontSize:16, color:TEXT, outline:"none", fontFamily:"inherit", minHeight:48 }}/>
        <button onClick={send}
          aria-label="送信"
          style={{ padding:"13px 22px", fontSize:14, fontWeight:700,
          background:`linear-gradient(135deg,${MINT},${CYAN})`, color:"#0a0a10", border:"none", borderRadius:12,
          boxShadow:`0 4px 18px ${MINTG}`, minHeight:48 }}>送信</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  useEffect(()=>{
    const el=document.createElement("style");
    el.textContent=STYLES;
    document.head.appendChild(el);
    return()=>{ try{ document.head.removeChild(el); }catch(e){} };
  },[]);

  const [page,setPage] = useState("home");
  const [tab,setTab]   = useState(0);
  const [time,setTime] = useState(new Date());

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return()=>clearInterval(t);
  },[]);

  const navMap = { home:"ダッシュボード", tx:"取引一覧", cal:"カレンダー", ana:"分析", budget:"予算管理", ai:"AI相談", notif:"通知" };

  return (
    <div style={{ minHeight:"100vh", background:BG, position:"relative" }}>
      {/* Mesh background ★ クラス付与でreduce-motion時に停止 */}
      <div className="mesh-bg" style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        backgroundImage:`
          radial-gradient(ellipse 700px 500px at 10% 5%, rgba(167,139,250,.16), transparent 55%),
          radial-gradient(ellipse 600px 400px at 90% 25%, rgba(94,234,212,.10), transparent 55%),
          radial-gradient(ellipse 500px 350px at 50% 100%, rgba(34,211,238,.08), transparent 55%)
        `,
        animation:"meshShift 20s ease-in-out infinite alternate" }}/>
      {/* Grid */}
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none",
        backgroundImage:`linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)`,
        backgroundSize:"40px 40px" }}/>

      {/* Sidebar (PC only) */}
      <div style={{ display:"none" }} className="sidebar-wrap">
        <Sidebar active={page} onNav={setPage}/>
      </div>
      <style>{`@media(min-width:768px){.sidebar-wrap{display:block!important}.main-ml{margin-left:220px!important}.bnav-wrap{display:none!important}}`}</style>

      <div className="main-ml" style={{ position:"relative", zIndex:2, minHeight:"100vh", paddingBottom:80 }}>
        {/* Header */}
        <header style={{ background:"rgba(8,8,14,.55)", backdropFilter:"blur(24px)", borderBottom:`1px solid ${BORDER}`,
          padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:30 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <h1 style={{ fontSize:17, fontWeight:700, color:TEXT, letterSpacing:"-.01em" }}>{navMap[page]||"ダッシュボード"}</h1>
            <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:99,
              background:"rgba(94,234,212,.08)", border:"1px solid rgba(94,234,212,.22)",
              fontSize:11, fontWeight:600, color:MINT }}>
              <LiveDot color={MINT}/> LIVE
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span className="mono" style={{ fontSize:12, color:TEXT3, letterSpacing:".04em" }}>
              {time.toLocaleTimeString("ja-JP",{hour12:false})}
            </span>
            {/* 🔔 通知ベル — ★ 34x34 → 44x44 へ拡大（Apple HIG 最小タップ領域準拠） */}
            <button onClick={()=>setPage("notif")}
              aria-label="通知を開く（未読あり）"
              style={{ position:"relative", background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:10, width:44, height:44, display:"flex", alignItems:"center", justifyContent:"center", color:TEXT2, fontSize:17, transition:"all .18s" }}>
              ⚑
              <span style={{ position:"absolute", top:7, right:7, width:8, height:8, borderRadius:"50%", background:DOWN, border:`1.5px solid ${BG}`, boxShadow:`0 0 6px ${DOWN}` }}/>
            </button>
            <select aria-label="月を選択"
              style={{ fontSize:13, border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px",
              background:PANEL, color:TEXT, outline:"none", backdropFilter:"blur(20px)", fontFamily:"JetBrains Mono,monospace", minHeight:44 }}>
              <option>2026.05</option><option>2026.04</option>
            </select>
          </div>
        </header>

        <Ticker/>

        <div style={{ maxWidth:820, margin:"0 auto", padding:"20px 22px" }}>
          {/* Dashboard tabs */}
          {page==="home" && (
            <>
              <div style={{ display:"inline-flex", gap:4, background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, borderRadius:12, padding:4, marginBottom:18 }}>
                {DASH_TABS.map((t,i)=>(
                  <button key={i} onClick={()=>setTab(i)}
                    aria-pressed={tab===i}
                    style={{ padding:"10px 20px", borderRadius:9, fontSize:13, fontWeight:500, border:"none",
                    background: tab===i?"rgba(94,234,212,.12)":"transparent",
                    color: tab===i?MINT:TEXT3,
                    boxShadow: tab===i?`0 0 8px ${MINTG}`:"none",
                    letterSpacing:".02em", minHeight:40 }}>{t}</button>
                ))}
              </div>
              {tab===0 && <DashHome/>}
              {tab===1 && <DashAnalytics/>}
              {tab===2 && <DashStrategy/>}
            </>
          )}
          {page==="tx"     && <TxScreen/>}
          {page==="budget" && <BudgetScreen/>}
          {page==="ai"     && <AIChatScreen/>}
          {page==="notif"  && <NotifScreen/>}
          {page==="ana"    && <DashAnalytics/>}
          {page==="cal"    && <CalendarScreen/>}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="bnav-wrap" style={{ position:"fixed", bottom:0, left:0, right:0, paddingBottom:24, paddingTop:8,
        background:`linear-gradient(180deg,transparent,rgba(10,10,16,.92) 30%)`, zIndex:40 }}>
        <div style={{ margin:"0 14px", padding:"8px 12px",
          background:"rgba(20,22,32,.88)", backdropFilter:"blur(20px) saturate(160%)",
          border:`1px solid ${BORDERS}`, borderRadius:22,
          display:"flex", alignItems:"center", justifyContent:"space-around",
          boxShadow:"0 8px 32px rgba(0,0,0,.55)" }}>
          {[
            { id:"home", icon:"⌂", label:"ホーム" },
            { id:"tx",   icon:"≡", label:"取引" },
            { id:"fab" },
            { id:"cal",  icon:"▦", label:"カレンダー" },
            { id:"ai",   icon:"◈", label:"AI" },
          ].map((it,i)=> it.id==="fab" ? (
            <button key={i} onClick={()=>setPage("tx")}
              aria-label="取引を追加"
              style={{
              width:52, height:52, borderRadius:18,
              background:`linear-gradient(135deg,${MINT},${CYAN})`,
              border:"none", color:"#0a0a10", fontSize:24, fontWeight:300,
              boxShadow:`0 4px 18px ${MINTG}, inset 0 1px 0 rgba(255,255,255,.4)`,
              marginTop:-22,
            }}>＋</button>
          ) : (
            <button key={i} onClick={()=>setPage(it.id)}
              aria-label={it.label}
              aria-current={page===it.id ? "page" : undefined}
              style={{
              background:"none", border:"none", padding:"8px 10px",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3,
              color: page===it.id?MINT:TEXT3, transition:"color .18s",
              minWidth:48, minHeight:48,
            }}>
              <span style={{ fontSize:20 }}>{it.icon}</span>
              <span style={{ fontSize:11, fontWeight:600 }}>{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
