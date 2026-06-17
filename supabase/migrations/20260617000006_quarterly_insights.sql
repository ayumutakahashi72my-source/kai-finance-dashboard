-- Opus 四半期深層分析レポート
CREATE TABLE IF NOT EXISTS public.quarterly_insights (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid    NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  year            integer NOT NULL,
  quarter         integer NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  content         text    NOT NULL,
  model           text    NOT NULL DEFAULT 'claude-opus-4-8',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, year, quarter)
);

ALTER TABLE public.quarterly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read own quarterly insights"
  ON public.quarterly_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid()
        AND household_id = quarterly_insights.household_id
    )
  );

GRANT SELECT ON public.quarterly_insights TO authenticated;

CREATE INDEX IF NOT EXISTS idx_quarterly_insights_household
  ON public.quarterly_insights(household_id, year DESC, quarter DESC);
