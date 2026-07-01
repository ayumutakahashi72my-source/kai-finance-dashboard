-- 除外パターン学習テーブル
-- ユーザーが重複チェッカーで除外した取引のパターンを記憶し、
-- 次回以降の取込時に同じパターンを自動除外する

CREATE TABLE IF NOT EXISTS public.exclude_patterns (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  source_account text NOT NULL,
  payee_keyword  text NOT NULL,
  hit_count      integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, source_account, payee_keyword)
);

CREATE INDEX IF NOT EXISTS idx_exclude_patterns_household
  ON public.exclude_patterns (household_id);

ALTER TABLE public.exclude_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exclude_patterns: select"
  ON public.exclude_patterns FOR SELECT
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "exclude_patterns: insert"
  ON public.exclude_patterns FOR INSERT
  WITH CHECK (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "exclude_patterns: update"
  ON public.exclude_patterns FOR UPDATE
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "exclude_patterns: delete"
  ON public.exclude_patterns FOR DELETE
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));
