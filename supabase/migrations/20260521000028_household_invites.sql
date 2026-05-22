-- =============================================
-- 招待テーブル
-- =============================================
CREATE TABLE public.household_invites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  token        uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by   uuid        NOT NULL REFERENCES auth.users(id),
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at      timestamptz,
  used_by      uuid        REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

-- 管理者のみ招待を作成・閲覧可
CREATE POLICY "household_invites: insert"
  ON public.household_invites FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "household_invites: select"
  ON public.household_invites FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

GRANT SELECT, INSERT ON public.household_invites TO authenticated;

-- =============================================
-- 招待情報取得（RLS回避のためSECURITY DEFINER）
-- 認証済みユーザーなら誰でも呼べる（参加前でも）
-- =============================================
CREATE OR REPLACE FUNCTION public.get_invite_info(p_token uuid)
RETURNS TABLE (
  household_id   uuid,
  household_name text,
  is_valid       boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.household_id,
    h.name AS household_name,
    (i.used_at IS NULL AND i.expires_at > now()) AS is_valid
  FROM public.household_invites i
  JOIN public.households h ON h.id = i.household_id
  WHERE i.token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_info(uuid) TO authenticated;

-- =============================================
-- 招待受諾（トークン検証 + household_membersへの追加）
-- =============================================
CREATE OR REPLACE FUNCTION public.accept_household_invite(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_invite FROM public.household_invites WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_used');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- すでに同じ世帯のメンバーなら成功扱い
  IF EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = v_invite.household_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('ok', true, 'household_id', v_invite.household_id);
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role, is_admin)
  VALUES (v_invite.household_id, v_user_id, 'member', false);

  UPDATE public.household_invites
  SET used_at = now(), used_by = v_user_id
  WHERE token = p_token;

  RETURN jsonb_build_object('ok', true, 'household_id', v_invite.household_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_household_invite(uuid) TO authenticated;
