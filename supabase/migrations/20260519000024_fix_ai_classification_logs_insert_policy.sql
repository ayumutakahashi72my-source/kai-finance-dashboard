-- ai_classification_logs の INSERT RLS ポリシーが欠落していたため追加
-- GRANT INSERT は既存 (0023) だが RLS が有効な場合ポリシーも必要

CREATE POLICY "ai_logs: household members can insert"
  ON public.ai_classification_logs FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );
