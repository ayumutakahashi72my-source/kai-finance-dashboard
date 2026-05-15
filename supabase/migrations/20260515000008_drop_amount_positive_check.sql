-- 001_transactions.sql で付与された amount > 0 制約を削除する。
-- MF CSV の支出は負の値で格納されるため、この制約がインポートを阻んでいた。
alter table public.transactions
  drop constraint if exists transactions_amount_check;
