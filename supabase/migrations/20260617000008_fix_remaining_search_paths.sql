-- search_path 固定: 残り3関数 + デモ関数 anon REVOKE

-- ① set_updated_at: now() は pg_catalog 経由で search_path = '' でも解決される
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ② match_category_rag: <=> 演算子が public スキーマにあるため search_path = 'public'
CREATE OR REPLACE FUNCTION public.match_category_rag(
  query_embedding vector(512),
  p_household_id  uuid,
  match_threshold float DEFAULT 0.85,
  match_count     int   DEFAULT 1
)
RETURNS TABLE (
  payee_key   text,
  category_id uuid,
  confidence  real,
  similarity  float
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT
    cr.payee_key,
    cr.category_id,
    cr.confidence,
    1 - (cr.embedding <=> query_embedding) AS similarity
  FROM category_rag cr
  WHERE cr.household_id = p_household_id
    AND cr.embedding IS NOT NULL
    AND 1 - (cr.embedding <=> query_embedding) > match_threshold
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE EXECUTE ON FUNCTION public.match_category_rag FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.match_category_rag TO authenticated;

-- ③ ocr_cache_upsert: public.household_members / public.ocr_store_cache は既に修飾済み
CREATE OR REPLACE FUNCTION public.ocr_cache_upsert(
  p_household_id uuid,
  p_store_key    text,
  p_payee        text,
  p_hints        jsonb,
  p_confidence   real,
  p_last_seen    date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id      = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied: household % is not accessible by caller', p_household_id;
  END IF;

  INSERT INTO public.ocr_store_cache
    (household_id, store_key, payee, hints, confidence, hit_count, last_seen)
  VALUES
    (p_household_id, p_store_key, p_payee, p_hints, p_confidence, 1, p_last_seen)
  ON CONFLICT (household_id, store_key) DO UPDATE SET
    payee      = CASE WHEN EXCLUDED.confidence > ocr_store_cache.confidence
                      THEN EXCLUDED.payee ELSE ocr_store_cache.payee END,
    hints      = CASE WHEN EXCLUDED.confidence > ocr_store_cache.confidence
                      THEN EXCLUDED.hints ELSE ocr_store_cache.hints END,
    confidence = GREATEST(EXCLUDED.confidence, ocr_store_cache.confidence),
    last_seen  = GREATEST(EXCLUDED.last_seen,  ocr_store_cache.last_seen),
    hit_count  = ocr_store_cache.hit_count + 1;
END;
$$;

REVOKE ALL    ON FUNCTION public.ocr_cache_upsert FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ocr_cache_upsert TO authenticated;

-- ④ デモ・内部関数の PUBLIC 権限剥奪
-- anon は PUBLIC を継承するため、REVOKE FROM anon では不十分。
-- REVOKE ALL FROM PUBLIC が必要。関数オーナー(postgres)は権限に関わらず常に実行可能。

-- 内部専用（他の SECURITY DEFINER 関数からのみ呼ばれる）: 誰にも GRANT しない
REVOKE ALL ON FUNCTION public._seed_demo_goals(uuid)               FROM PUBLIC;
REVOKE ALL ON FUNCTION public._seed_demo_monthly_data(uuid)        FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_default_categories()             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable()                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decay_category_rag_confidence(uuid)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;

-- ユーザー向け（認証済みユーザーが直接呼ぶ）: authenticated にのみ GRANT
REVOKE ALL    ON FUNCTION public.setup_demo_household(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.setup_demo_household(uuid) TO authenticated;

REVOKE ALL    ON FUNCTION public.reset_demo_data(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_demo_data(text) TO authenticated;
