-- 支出異常検知フラグテーブル
-- 前3ヶ月平均との乖離が ±30% 以上のカテゴリを月次Cronが記録する
CREATE TABLE IF NOT EXISTS public.monthly_anomaly_flags (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  month           date        NOT NULL,   -- YYYY-MM-01（対象月の1日）
  category_id     uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name   text        NOT NULL,
  actual_amount   integer     NOT NULL,   -- 当月支出（円、正値）
  expected_amount integer     NOT NULL,   -- 前3ヶ月平均（円、正値）
  deviation_rate  numeric(6,4) NOT NULL,  -- (actual - expected) / expected
  anomaly_type    text        NOT NULL CHECK (anomaly_type IN ('spike', 'drop')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, month, category_id)
);

ALTER TABLE public.monthly_anomaly_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read own anomaly flags"
  ON public.monthly_anomaly_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid()
        AND household_id = monthly_anomaly_flags.household_id
    )
  );

GRANT SELECT ON public.monthly_anomaly_flags TO authenticated;

CREATE INDEX IF NOT EXISTS idx_anomaly_flags_household_month
  ON public.monthly_anomaly_flags(household_id, month DESC);
