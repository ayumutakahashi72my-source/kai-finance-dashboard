-- =============================================
-- user_category_knowledge: ユーザーレベルの分類学習データ
-- 世帯を移動・解散しても保持される個人の学習キャッシュ
-- =============================================

CREATE TABLE public.user_category_knowledge (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_key     text        NOT NULL,
  category_name text        NOT NULL,
  confidence    real        NOT NULL DEFAULT 0.7,
  hit_count     integer     NOT NULL DEFAULT 1,
  embedding     vector(512),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, payee_key)
);

ALTER TABLE public.user_category_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_category_knowledge: own rows"
  ON public.user_category_knowledge
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_knowledge TO authenticated;

CREATE INDEX idx_user_cat_knowledge_user_payee
  ON public.user_category_knowledge(user_id, payee_key);
