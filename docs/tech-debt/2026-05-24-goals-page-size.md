# Tech Debt: goals/page.tsx サイズ超過

Date: 2026-05-24  
Priority: Low  
Effort: ~1 hour

## 問題

`app/settings/goals/page.tsx` が約600行（500行 warning threshold 超え）。

構成要素：
- `DeadlineInput` コンポーネント (~60行)
- `CreateForm` コンポーネント (~90行)
- `GoalCard` コンポーネント (~170行)
- ページ本体 (~80行)

## 分割案

```
app/settings/goals/
  page.tsx           — ページ本体のみ (~100行)
  _components/
    DeadlineInput.tsx (~70行)
    CreateForm.tsx    (~100行)
    GoalCard.tsx      (~180行)
```

## 注意

- `DeadlineInput` は `CreateForm` と `GoalCard` の両方で使うため shared に置く
- `FinancialGoal` 型の import 先も整理が必要
- デザイン・バリデーションロジックは変更しない

## 現状への影響

機能上の問題はなし。ルール上のwarning。Week 14以降のスロット調整時に対応。
