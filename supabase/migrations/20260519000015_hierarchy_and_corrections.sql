-- 1. categories に parent_id 追加（NULL = ルートレベル。既存行は変更なし）
ALTER TABLE public.categories
  ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX idx_categories_parent ON public.categories(parent_id);

-- 2. category_corrections テーブル
--    ユーザーが手動でカテゴリを修正した履歴を保持し、次回分類に活用する
CREATE TABLE public.category_corrections (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  payee_key       text        NOT NULL,   -- normalizeKeyword() 済みの形式
  old_category_id uuid        REFERENCES public.categories(id) ON DELETE SET NULL,
  new_category_id uuid        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  corrected_by    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  corrected_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_corrections ENABLE ROW LEVEL SECURITY;

-- 同世帯メンバーが閲覧可能
CREATE POLICY "corrections: select"
  ON public.category_corrections FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- 自身が世帯メンバーの場合のみ挿入可能（UPDATE不可：追記のみ）
CREATE POLICY "corrections: insert"
  ON public.category_corrections FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
    AND corrected_by = auth.uid()
  );

GRANT SELECT, INSERT ON public.category_corrections TO authenticated;

-- payee_key ごとの最新修正を1クエリで取得できるよう降順インデックス
CREATE INDEX idx_corrections_household_payee_at
  ON public.category_corrections(household_id, payee_key, corrected_at DESC);
