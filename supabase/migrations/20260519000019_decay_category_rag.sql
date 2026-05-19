-- 月初 Cron から呼ばれる category_rag.confidence の自然減衰関数。
-- 使われ続けた payee は LLM/correction で書き換わるため confidence が維持されるが、
-- 古く・使われなくなった payee_key は徐々に値が下がり exact cache 閾値 (0.90) を下回って LLM 再評価される。

CREATE OR REPLACE FUNCTION decay_category_rag_confidence(p_household_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE category_rag
  SET confidence = confidence * 0.95
  WHERE household_id = p_household_id;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION decay_category_rag_confidence(uuid) TO authenticated;
