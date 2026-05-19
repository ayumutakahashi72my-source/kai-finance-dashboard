-- =====================================================================
-- Migration 17: AI cost tracking + feedback loop improvements
-- =====================================================================

-- 1. Unified AI cost log for all models/features
--    One row per API call (not per transaction).
CREATE TABLE public.ai_cost_logs (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid          NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  model         text          NOT NULL,   -- 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-6'
  feature       text          NOT NULL,   -- 'classification' | 'chat' | 'monthly_summary' | 'budget_suggest' | 'spending_pattern'
  input_tokens  integer       NOT NULL DEFAULT 0,
  output_tokens integer       NOT NULL DEFAULT 0,
  cost_usd      numeric(10,8) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_cost_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_logs: household members can select"
  ON public.ai_cost_logs FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Admins can read all (for analytics route)
CREATE POLICY "cost_logs: admin insert via service"
  ON public.ai_cost_logs FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.ai_cost_logs TO authenticated;

CREATE INDEX idx_ai_cost_logs_household_created ON public.ai_cost_logs(household_id, created_at DESC);
CREATE INDEX idx_ai_cost_logs_feature ON public.ai_cost_logs(feature, created_at DESC);

-- 2. Daily cost aggregation view (for admin dashboard)
CREATE OR REPLACE VIEW public.ai_cost_daily_stats AS
SELECT
  date_trunc('day', created_at AT TIME ZONE 'Asia/Tokyo')::date AS day,
  model,
  feature,
  COUNT(*)                          AS call_count,
  SUM(input_tokens)                 AS total_input_tokens,
  SUM(output_tokens)                AS total_output_tokens,
  SUM(cost_usd)                     AS total_cost_usd,
  ROUND(SUM(cost_usd) * 150, 2)     AS total_cost_jpy
FROM public.ai_cost_logs
GROUP BY 1, 2, 3;

-- Feedback loop: track RAG promotion in category_corrections
-- New column: tracks whether this correction was promoted to category_rag
ALTER TABLE public.category_corrections
  ADD COLUMN IF NOT EXISTS rag_promoted    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_promoted_at timestamptz;

-- Allow authenticated users to update rag_promoted on their own household's corrections
-- (used by monthly cron via service role, and by API routes to mark promoted)
CREATE POLICY "corrections: update rag_promoted"
  ON public.category_corrections FOR UPDATE
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

GRANT UPDATE (rag_promoted, rag_promoted_at) ON public.category_corrections TO authenticated;
