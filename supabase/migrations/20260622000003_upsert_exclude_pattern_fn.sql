-- 除外パターンの upsert + hit_count 加算を1クエリで行う関数
-- これがないと learnExcludePattern の upsert が毎回 hit_count を 1 にリセットしてしまう
-- SECURITY INVOKER: 呼び出し元の権限（RLS）で実行される

CREATE OR REPLACE FUNCTION public.upsert_exclude_pattern(
  p_household_id   uuid,
  p_source_account text,
  p_payee_keyword  text
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
AS $$
  INSERT INTO public.exclude_patterns (household_id, source_account, payee_keyword, hit_count)
  VALUES (p_household_id, p_source_account, p_payee_keyword, 1)
  ON CONFLICT (household_id, source_account, payee_keyword)
  DO UPDATE SET
    hit_count  = public.exclude_patterns.hit_count + 1,
    updated_at = now();
$$;
