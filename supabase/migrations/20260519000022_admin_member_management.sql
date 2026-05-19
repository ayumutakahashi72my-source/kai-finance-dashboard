-- =============================================
-- 管理者によるメンバー is_admin 更新ポリシー
-- =============================================

-- 管理者が同一世帯のメンバーの is_admin を変更できる
DROP POLICY IF EXISTS "household_members: admin update is_admin" ON public.household_members;
CREATE POLICY "household_members: admin update is_admin"
  ON public.household_members FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- =============================================
-- 世帯メンバー一覧（email 付き）を返す関数
-- SECURITY DEFINER により auth.users へのアクセスが可能
-- =============================================
CREATE OR REPLACE FUNCTION public.get_household_members_with_email()
RETURNS TABLE (
  id           uuid,
  user_id      uuid,
  household_id uuid,
  role         text,
  is_admin     boolean,
  joined_at    timestamptz,
  email        text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id uuid;
BEGIN
  -- 呼び出し元の世帯を取得
  SELECT hm.household_id INTO v_household_id
  FROM public.household_members hm
  WHERE hm.user_id = auth.uid()
  LIMIT 1;

  IF v_household_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    hm.id,
    hm.user_id,
    hm.household_id,
    hm.role,
    hm.is_admin,
    hm.joined_at,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email)::text AS display_name
  FROM public.household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = v_household_id
  ORDER BY hm.joined_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_household_members_with_email() TO authenticated;
