CREATE TABLE public.financial_goals (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id            uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name                    text        NOT NULL,
  target_amount           integer     NOT NULL CHECK (target_amount > 0),
  deadline                date        NOT NULL,
  monthly_savings_target  integer,
  monthly_spending_limit  integer,
  risk_level                   text    CHECK (risk_level IN ('safe','caution','danger')),
  advice                       text,
  suggested_months_alternative integer,
  plan_steps                   text[],
  last_calculated_at           timestamptz,
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can manage goals"
  ON public.financial_goals FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX financial_goals_household_active
  ON public.financial_goals (household_id, is_active, deadline);
