-- monthly_summaries: UPSERT（再生成）を許可
-- INSERT ... ON CONFLICT DO UPDATE には UPDATE 権限とポリシーが必要

GRANT UPDATE ON public.monthly_summaries TO authenticated;

CREATE POLICY "monthly_summaries: update"
  ON public.monthly_summaries FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );
