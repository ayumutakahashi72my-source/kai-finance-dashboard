-- atomic upsert for ocr_store_cache
-- GREATEST(old, new) で低品質上書きを防止し、同時リクエストの競合を排除
-- セキュリティ: SECURITY DEFINER だが内部で household 所有権を必ず検証する

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
AS $$
BEGIN
  -- ── 必須セキュリティチェック ──────────────────────────────────
  -- SECURITY DEFINER は RLS をバイパスするため、呼び出しユーザーが
  -- 対象 household のメンバーであることを明示的に確認する。
  IF NOT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = p_household_id
      AND user_id      = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied: household % is not accessible by caller', p_household_id;
  END IF;

  -- ── Atomic upsert ─────────────────────────────────────────────
  INSERT INTO public.ocr_store_cache
    (household_id, store_key, payee, hints, confidence, hit_count, last_seen)
  VALUES
    (p_household_id, p_store_key, p_payee, p_hints, p_confidence, 1, p_last_seen)
  ON CONFLICT (household_id, store_key) DO UPDATE SET
    -- 新しい confidence が高い場合のみ payee / hints を更新
    payee      = CASE WHEN EXCLUDED.confidence > ocr_store_cache.confidence
                      THEN EXCLUDED.payee ELSE ocr_store_cache.payee END,
    hints      = CASE WHEN EXCLUDED.confidence > ocr_store_cache.confidence
                      THEN EXCLUDED.hints ELSE ocr_store_cache.hints END,
    -- confidence は常に高い方を保持
    confidence = GREATEST(EXCLUDED.confidence, ocr_store_cache.confidence),
    last_seen  = GREATEST(EXCLUDED.last_seen,  ocr_store_cache.last_seen),
    hit_count  = ocr_store_cache.hit_count + 1;
END;
$$;

-- 認証済みユーザーのみ実行可
REVOKE ALL    ON FUNCTION public.ocr_cache_upsert FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ocr_cache_upsert TO authenticated;
