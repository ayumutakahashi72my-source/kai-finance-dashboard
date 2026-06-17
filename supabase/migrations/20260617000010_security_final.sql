-- セキュリティ最終修正
-- ① _seed_demo_transactions 8引数版（死コード）を DROP
-- ② api_error_logs INSERT policy を自世帯のみに制限
-- ③ decay_category_rag_confidence を service_role 専用に変更

-- ① 旧 8引数オーバーロードを削除
DROP FUNCTION IF EXISTS public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid);

-- ② api_error_logs: 任意 household_id への INSERT を禁止
--    authenticated ユーザーは自分が所属する世帯のログのみ挿入可能
DROP POLICY IF EXISTS "api_error_logs: insert" ON public.api_error_logs;

CREATE POLICY "api_error_logs: insert"
  ON public.api_error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IS NULL
    OR household_id IN (
      SELECT household_id
      FROM public.household_members
      WHERE user_id = auth.uid()
    )
  );

-- ③ decay_category_rag_confidence: Cron が service_role で呼ぶため authenticated を剥奪
--    search_path = '' も追加（public. 修飾済み）
CREATE OR REPLACE FUNCTION public.decay_category_rag_confidence(p_household_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.category_rag
  SET confidence = confidence * 0.95
  WHERE household_id = p_household_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- migration 008 で REVOKE ALL FROM PUBLIC は実施済み。
-- migration 019 で付与された GRANT TO authenticated を剥奪し、service_role に明示的に付与。
REVOKE EXECUTE ON FUNCTION public.decay_category_rag_confidence(uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.decay_category_rag_confidence(uuid) TO service_role;
