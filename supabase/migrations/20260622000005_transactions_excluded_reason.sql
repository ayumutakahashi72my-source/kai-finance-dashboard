-- 集計除外の理由を記録する
--   'account'   : 口座単位の除外（account_settings 由来）
--   'duplicate' : 重複チェッカー（自動除外 / 2件目以降除外）
--   'manual'    : 個別の手動除外
-- 口座を集計対象に戻す際、reason='account' の行のみ excluded=false に戻すことで、
-- 重複・手動除外を巻き戻さず保護する

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS excluded_reason text;
