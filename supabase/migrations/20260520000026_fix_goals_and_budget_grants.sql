-- financial_goals: GRANT が欠落していたため追加
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_goals TO authenticated;

-- budget_suggestions: DELETE policy/grant が欠落（?force=true 再生成に必要）
GRANT DELETE ON public.budget_suggestions TO authenticated;

CREATE POLICY "budget_suggestions: delete"
  ON public.budget_suggestions FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
