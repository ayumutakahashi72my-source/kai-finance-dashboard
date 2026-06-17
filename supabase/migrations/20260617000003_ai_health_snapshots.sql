-- AI システム日次ヘルス・スナップショット
-- Vercel Cron（毎朝 04:00 JST）が前日の統計を記録する
-- before/after 比較・長期トレンド可視化の土台

CREATE TABLE IF NOT EXISTS public.ai_health_snapshots (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id     uuid    NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  snapshot_date    date    NOT NULL,
  cache_rate       numeric(5,4),   -- (exact_cache + regex_rule) / total
  llm_rate         numeric(5,4),   -- llm_full / total
  failed_rate      numeric(5,4),   -- failed / total
  total_classified int,            -- 当日の分類件数
  total_learned    int,            -- category_rag の累計学習店舗数
  high_conf_count  int,            -- hit_count >= 3 の店舗数
  cost_usd         numeric(10,6),  -- 当日の AI コスト
  UNIQUE (household_id, snapshot_date)
);

ALTER TABLE public.ai_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read own health snapshots"
  ON public.ai_health_snapshots FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- Cron（service role）からの書き込みは API Route 経由で行うため
-- authenticated ユーザーへの INSERT/UPDATE は不要

CREATE INDEX idx_health_snapshots_household_date
  ON public.ai_health_snapshots(household_id, snapshot_date DESC);
