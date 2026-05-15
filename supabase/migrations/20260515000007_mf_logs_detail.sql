-- mf_sync_logs に詳細トレース列を追加
alter table public.mf_sync_logs
  add column if not exists steps_detail jsonb;
