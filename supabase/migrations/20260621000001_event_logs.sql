-- イベントログテーブル
-- クライアント・サーバー両方のイベントを記録する汎用ログ
-- 管理者のみ閲覧可、全認証ユーザーが書き込み可

CREATE TABLE public.event_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid,
  level        text        NOT NULL DEFAULT 'info',
  category     text        NOT NULL,
  message      text        NOT NULL,
  metadata     jsonb,
  url          text,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーは自世帯のログのみ挿入可
CREATE POLICY "event_logs: insert own"
  ON public.event_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- 管理者のみ自世帯のログを閲覧可
CREATE POLICY "event_logs: select admin"
  ON public.event_logs FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id FROM public.household_members hm
      WHERE hm.user_id = auth.uid() AND hm.is_admin = true
    )
  );

GRANT SELECT, INSERT ON public.event_logs TO authenticated;

CREATE INDEX idx_event_logs_household_created
  ON public.event_logs (household_id, created_at DESC);

CREATE INDEX idx_event_logs_level
  ON public.event_logs (level, created_at DESC);
