-- 集計除外フラグ + 保有金融機関カラム追加
-- クレカ二重計上対策: 削除ではなく集計除外で管理する

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS excluded       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_account text;

COMMENT ON COLUMN public.transactions.excluded IS '集計除外フラグ。振替・二重計上等の取引を収支集計から外す';
COMMENT ON COLUMN public.transactions.source_account IS 'MF CSVの「保有金融機関」。口座判別に使用';

-- excluded=false の取引を高速に取得するためのインデックス
CREATE INDEX IF NOT EXISTS idx_transactions_not_excluded
  ON public.transactions (household_id, occurred_on)
  WHERE excluded = false;
