-- AI チャット Vector Memory
-- チャット Q&A をベクトル化して保存し、次回以降の類似質問にコンテキスト注入する
CREATE TABLE IF NOT EXISTS public.ai_insights_embeddings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  question        text        NOT NULL,
  answer          text        NOT NULL,
  embedding       vector(512) NOT NULL,  -- voyage-3-lite 512次元
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "household members can read own insights"   ON public.ai_insights_embeddings;
DROP POLICY IF EXISTS "household members can insert own insights" ON public.ai_insights_embeddings;

CREATE POLICY "household members can read own insights"
  ON public.ai_insights_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid()
        AND household_id = ai_insights_embeddings.household_id
    )
  );

CREATE POLICY "household members can insert own insights"
  ON public.ai_insights_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE user_id = auth.uid()
        AND household_id = ai_insights_embeddings.household_id
    )
  );

GRANT SELECT, INSERT ON public.ai_insights_embeddings TO authenticated;

-- hnsw は空テーブルから機能し、データ増加後も自動的に有効になる（ivfflat は不可）
DROP INDEX IF EXISTS public.idx_insights_embedding_household;
CREATE INDEX IF NOT EXISTS idx_insights_embedding_hnsw
  ON public.ai_insights_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 類似 Q&A 検索 RPC
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
AS $$
  SELECT
    question,
    answer,
    1 - (embedding <=> p_embedding) AS similarity
  FROM public.ai_insights_embeddings
  WHERE household_id = p_household_id
    AND 1 - (embedding <=> p_embedding) > 0.82
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION search_insights(uuid, vector, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION search_insights(uuid, vector, int) TO authenticated;
