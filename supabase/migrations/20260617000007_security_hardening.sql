-- セキュリティ強化
-- 1. search_path 固定（function_search_path_mutable 警告の解消）
-- 2. デモ関数・decay 関数の anon EXECUTE 権限剥奪

-- get_rag_stats: SET search_path = '' を追加
DROP FUNCTION IF EXISTS get_rag_stats(uuid);
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
SET search_path = ''
AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE hit_count >= 3),
    COUNT(*) FILTER (WHERE hit_count = 1),
    COUNT(*) FILTER (WHERE hit_count = 2),
    COUNT(*) FILTER (WHERE hit_count BETWEEN 3 AND 4),
    COUNT(*) FILTER (WHERE hit_count BETWEEN 5 AND 9),
    COUNT(*) FILTER (WHERE hit_count >= 10)
  FROM public.category_rag
  WHERE household_id = p_household_id;
$$;

REVOKE EXECUTE ON FUNCTION get_rag_stats(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_rag_stats(uuid) TO authenticated;

-- search_insights: SET search_path = '' を追加
DROP FUNCTION IF EXISTS search_insights(uuid, vector, int);
CREATE OR REPLACE FUNCTION search_insights(
  p_household_id  uuid,
  p_embedding     vector(512),
  p_limit         int DEFAULT 3
)
RETURNS TABLE (
  question    text,
  answer      text,
  similarity  float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
-- vector 拡張の <=> 演算子が public スキーマにあるため '' ではなく 'public' が必要
SET search_path = 'public'
AS $$
  SELECT
    question,
    answer,
    1 - (embedding <=> p_embedding) AS similarity
  FROM ai_insights_embeddings
  WHERE household_id = p_household_id
    AND 1 - (embedding <=> p_embedding) > 0.82
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION search_insights(uuid, vector, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION search_insights(uuid, vector, int) TO authenticated;

-- デモ・内部関数の anon EXECUTE 権限剥奪
-- （anon から叩かれると未認証でデモデータが操作・破壊される）
REVOKE EXECUTE ON FUNCTION public._seed_demo_goals(uuid)               FROM anon;
REVOKE EXECUTE ON FUNCTION public._seed_demo_monthly_data(uuid)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.setup_demo_household(uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_demo_data(text)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_default_categories()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.decay_category_rag_confidence(uuid)   FROM anon;

-- _seed_demo_transactions は2つのオーバーロードが存在
REVOKE EXECUTE ON FUNCTION public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)           FROM anon;
REVOKE EXECUTE ON FUNCTION public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) FROM anon;
