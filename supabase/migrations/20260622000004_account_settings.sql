-- 口座（保有金融機関 = source_account）単位の集計対象/除外設定
-- excluded=true の口座の取引は transactions.excluded=true（reason='account'）に反映される
-- クロス口座二重計上（カード明細 vs 銀行のカード引き落とし）の集計除外に使う

CREATE TABLE IF NOT EXISTS public.account_settings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  source_account text NOT NULL,
  excluded       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, source_account)
);

CREATE INDEX IF NOT EXISTS idx_account_settings_household
  ON public.account_settings (household_id);

ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_settings: select"
  ON public.account_settings FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "account_settings: insert"
  ON public.account_settings FOR INSERT
  WITH CHECK (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "account_settings: update"
  ON public.account_settings FOR UPDATE
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "account_settings: delete"
  ON public.account_settings FOR DELETE
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));
