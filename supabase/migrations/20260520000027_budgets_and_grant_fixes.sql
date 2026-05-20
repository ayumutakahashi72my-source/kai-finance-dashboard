-- ① budgets テーブル（ユーザー設定の月次カテゴリ別予算）
CREATE TABLE public.budgets (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  month        date        NOT NULL,        -- YYYY-MM-01 形式
  category_name text       NOT NULL,
  amount       integer     NOT NULL CHECK (amount > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, month, category_name)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets: all"
  ON public.budgets FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;

-- ② api_error_logs / notifications への DELETE grant 不足（Cron クリーンアップに必要）
GRANT DELETE ON public.api_error_logs  TO authenticated;
GRANT DELETE ON public.notifications   TO authenticated;

-- notifications: DELETE policy が未定義のため追加
CREATE POLICY "notifications: delete own"
  ON public.notifications FOR DELETE
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );
