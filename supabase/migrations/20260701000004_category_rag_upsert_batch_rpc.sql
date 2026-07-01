-- R-3/R-7: category_rag への書き込みをアトミック化し、以下の2つの問題を解消する。
--
-- R-3 (confidence退化防止): 同一カテゴリへの再分類でconfidenceが低い結果が出ても、
--   既存の高いconfidenceを上書きしない（GREATEST）。ただしカテゴリ自体が変わった
--   場合は、古いカテゴリの高confidenceを引き継がず新しい値でそのまま置き換える
--   （別カテゴリとしての新しい学習事象として扱う）。
--
-- R-7 (hit_count是正): 同一カテゴリへの再ヒットのたびにDB側でアトミックに+1する。
--   従来はexact_cacheヒット時に増分されず「複数回学習済み」の指標として不正確だった。
--   カテゴリが変わった場合はhit_countを1にリセットする（別カテゴリの学習をやり直す）。
--
-- ocr_cache_upsert (20260523000003) と同じ設計思想: SECURITY DEFINER だが
-- household所有権を必ず検証する。

CREATE OR REPLACE FUNCTION public.category_rag_upsert_batch(
  p_household_id uuid,
  p_rows jsonb  -- [{payee_key, category_id, confidence, embedding, hit_count, last_seen}, ...]
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

  INSERT INTO public.category_rag (household_id, payee_key, category_id, confidence, embedding, hit_count, last_seen)
  SELECT
    p_household_id,
    r->>'payee_key',
    (r->>'category_id')::uuid,
    (r->>'confidence')::real,
    CASE
      WHEN r->'embedding' IS NULL OR jsonb_typeof(r->'embedding') = 'null' THEN NULL
      ELSE (
        SELECT ('[' || string_agg(elem::text, ',') || ']')::vector(512)
        FROM jsonb_array_elements_text(r->'embedding') elem
      )
    END,
    1,
    (r->>'last_seen')::date
  FROM jsonb_array_elements(p_rows) r
  ON CONFLICT (household_id, payee_key) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    confidence  = CASE
                    WHEN EXCLUDED.category_id = category_rag.category_id
                    THEN GREATEST(category_rag.confidence, EXCLUDED.confidence)
                    ELSE EXCLUDED.confidence
                  END,
    embedding   = COALESCE(EXCLUDED.embedding, category_rag.embedding),
    hit_count   = CASE
                    WHEN EXCLUDED.category_id = category_rag.category_id
                    THEN category_rag.hit_count + 1
                    ELSE 1
                  END,
    last_seen   = GREATEST(category_rag.last_seen, EXCLUDED.last_seen);
END;
$$;

REVOKE ALL    ON FUNCTION public.category_rag_upsert_batch FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.category_rag_upsert_batch TO authenticated;
