-- R-6: キーワードルールが一致したがカテゴリ未登録だった件数(regex_miss)を
-- 日次集計ビューで可視化する。運用者が「このキーワードルールは実質機能していない」
-- 状態に気づけるようにするための可視化のみが目的で、自動カテゴリ作成は行わない
-- （設計レビューで「リネーム履歴を無視して重複を再発させる」として却下した旧案の代替）。
--
-- 注意: regex_miss は同一取引について、必ず別のmethod（vector_direct/llm_full等）でも
-- 1行記録される「診断用の追加ログ」であり、実際の分類結果ではない。
-- そのため total / cache_hits / avg_latency 等の主要指標には含めず、
-- 独立した regex_miss 列としてのみ集計する（含めるとhitRateが不当に低く見えてしまう）。

CREATE OR REPLACE VIEW public.ai_classification_daily_stats AS
WITH base AS (
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
  WHERE method <> 'regex_miss'
  GROUP BY date_trunc('day', created_at), household_id
),
misses AS (
  SELECT
    date_trunc('day', created_at) AS day,
    household_id,
    count(*) AS regex_miss
  FROM public.ai_classification_logs
  WHERE method = 'regex_miss'
  GROUP BY date_trunc('day', created_at), household_id
)
SELECT
  base.day,
  base.household_id,
  base.total,
  base.cache_hits,
  base.corrections,
  base.exact_cache,
  COALESCE(misses.regex_miss, 0) AS regex_miss,
  base.vector_direct,
  base.vector_rerank,
  base.llm_full,
  base.llm_freeform,
  base.failed,
  base.avg_latency_ms,
  base.avg_confidence,
  base.avg_similarity,
  base.total_api_calls
FROM base
LEFT JOIN misses ON misses.day = base.day AND misses.household_id = base.household_id;

GRANT SELECT ON public.ai_classification_daily_stats TO authenticated;
