-- P11: サブスク管理用に確認済みフラグを追加（dismissed は既存）
ALTER TABLE public.fixed_expense_suggestions
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
