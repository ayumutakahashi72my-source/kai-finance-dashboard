-- ai_classification_daily_stats ビューの SECURITY DEFINER 警告を修正
--
-- PostgreSQL のビューはデフォルトで作成者権限（SECURITY DEFINER 相当）で動作し、
-- 下層テーブルの RLS をバイパスする。
-- WITH (security_invoker = on) を追加することでクエリ実行ユーザーの RLS を適用させる。

CREATE OR REPLACE VIEW public.ai_classification_daily_stats
WITH (security_invoker = on)
AS
SELECT
  date_trunc('day', created_at) AS day,
  household_id,
  count(*)                                              AS total,
  count(*) FILTER (WHERE is_cache_hit)                  AS cache_hits,
  count(*) FILTER (WHERE method = 'correction')         AS corrections,
  count(*) FILTER (WHERE method = 'exact_cache')        AS exact_cache,
  count(*) FILTER (WHERE method = 'vector_direct')      AS vector_direct,
  count(*) FILTER (WHERE method = 'vector_rerank')      AS vector_rerank,
  count(*) FILTER (WHERE method = 'llm_full')           AS llm_full,
  count(*) FILTER (WHERE method = 'llm_freeform')       AS llm_freeform,
  count(*) FILTER (WHERE method = 'failed')             AS failed,
  round(avg(latency_ms))                                AS avg_latency_ms,
  round(avg(confidence)::numeric, 3)                    AS avg_confidence,
  round(avg(similarity) FILTER (WHERE similarity IS NOT NULL)::numeric, 3) AS avg_similarity,
  sum(api_calls)                                        AS total_api_calls
FROM public.ai_classification_logs
GROUP BY date_trunc('day', created_at), household_id;

GRANT SELECT ON public.ai_classification_daily_stats TO authenticated;
