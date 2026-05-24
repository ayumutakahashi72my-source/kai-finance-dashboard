# Tech Debt: NowTab rendering cost

Date: 2026-05-24  
Priority: Medium  
Effort: ~45 min

## 問題

`components/dashboard/NowTab.tsx` (510行) に以下の問題がある:

1. **82個のインラインstyleオブジェクト** — render毎に新規オブジェクト生成、React reconciliationコスト増大
2. **donut arc geometry の useMemo 未使用** — `CategoryRingHero` 内でtrig計算が毎render実行される

## 修正方針

### Step 1: style定数の抽出（優先）

最も使用頻度の高い15スタイルをmodule-levelの `const S = {...} as const` に抽出する。
インライン style をすべて変換する必要はない — 動的な値（色やwidthがpropsで変わる箇所）はインラインのまま残す。

### Step 2: useMemo for arc calculation

```typescript
const arcs = useMemo(
  () => segments.reduce<ArcData[]>(...), 
  [segments, total]
)
```

## 注意

デザイントークン変更禁止。レイアウト変更禁止。
style の値を変えずに、参照の安定化のみ行う。
