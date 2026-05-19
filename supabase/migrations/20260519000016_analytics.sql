-- =============================================
-- 運用分析基盤
-- 1. ai_classification_logs  — AI分類の全ログを記録
-- 2. household_members.is_admin — 管理者フラグ
-- =============================================

-- AI分類ログテーブル
CREATE TABLE IF NOT EXISTS public.ai_classification_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        REFERENCES public.households(id) ON DELETE CASCADE,
  payee           text        NOT NULL,
  payee_key       text        NOT NULL,   -- normalizeKeyword() 済み
  category_hint   text,
  category_id     uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name   text,
  method          text        NOT NULL,   -- 'correction'|'exact_cache'|'vector_direct'|'vector_rerank'|'llm_full'|'llm_freeform'|'failed'
  confidence      numeric(4,3),           -- 0.000–1.000
  similarity      numeric(4,3),           -- ベクトル類似度（vector経路のみ）
  latency_ms      integer,               -- 分類にかかった時間
  api_calls       smallint DEFAULT 0,    -- Anthropic API呼び出し回数
  is_cache_hit    boolean DEFAULT false, -- RAGキャッシュからの即時解決
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_classification_logs ENABLE ROW LEVEL SECURITY;

-- is_admin カラム追加（DEFAULT false = 既存ユーザーへの影響なし）
-- ⚠️ ポリシー作成より前に実行する必要がある
ALTER TABLE public.household_members
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_household_members_admin
  ON public.household_members(user_id) WHERE is_admin = true;

-- 管理者のみ参照可能
DROP POLICY IF EXISTS "ai_logs: select by admin" ON public.ai_classification_logs;
CREATE POLICY "ai_logs: select by admin"
  ON public.ai_classification_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- API Route（service_role）からのみ書き込み可能（anon/authenticated 不可）
-- INSERT は service_role key 経由のみなので RLS ポリシーは不要

-- インデックス（ダッシュボードクエリ高速化）
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON public.ai_classification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_logs_household_method ON public.ai_classification_logs(household_id, method);
CREATE INDEX IF NOT EXISTS idx_ai_logs_household_date ON public.ai_classification_logs(household_id, created_at DESC);

-- 集計ビュー: 日次ヒット率（ダッシュボード用）
CREATE OR REPLACE VIEW public.ai_classification_daily_stats AS
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
