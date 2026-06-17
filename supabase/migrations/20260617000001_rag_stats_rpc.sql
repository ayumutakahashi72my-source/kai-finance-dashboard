-- RAG学習状況を集計するRPC
-- RETURNS TABLE で型付け → Supabase 型生成が有効になる
-- SECURITY INVOKER で category_rag の RLS を尊重
-- GRANT を明示して anon からの呼び出しを禁止

CREATE OR REPLACE FUNCTION get_rag_stats(p_household_id uuid)
RETURNS TABLE (
  total_learned   bigint,
  high_confidence bigint,
  dist_once       bigint,
  dist_twice      bigint,
  dist_three_four bigint,
  dist_five_nine  bigint,
  dist_ten_plus   bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COUNT(*)                                                AS total_learned,
    COUNT(*) FILTER (WHERE hit_count >= 3)                  AS high_confidence,
    COUNT(*) FILTER (WHERE hit_count = 1)                   AS dist_once,
    COUNT(*) FILTER (WHERE hit_count = 2)                   AS dist_twice,
    COUNT(*) FILTER (WHERE hit_count BETWEEN 3 AND 4)       AS dist_three_four,
    COUNT(*) FILTER (WHERE hit_count BETWEEN 5 AND 9)       AS dist_five_nine,
    COUNT(*) FILTER (WHERE hit_count >= 10)                 AS dist_ten_plus
  FROM category_rag
  WHERE household_id = p_household_id;
$$;

REVOKE EXECUTE ON FUNCTION get_rag_stats(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_rag_stats(uuid) TO authenticated;
