-- =============================================
-- Week 5: MF自動取り込み監査ログテーブル
-- =============================================

create table public.mf_sync_logs (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  triggered_by text        not null check (triggered_by in ('cron', 'manual')),
  status       text        not null check (status in ('success', 'error')),
  step         text,                   -- どのステップで止まったか
  inserted     integer     default 0,
  skipped      integer     default 0,
  year         integer,
  month        integer,
  error_msg    text,
  created_at   timestamptz not null default now()
);

alter table public.mf_sync_logs enable row level security;

create policy "mf_sync_logs: select"
  on public.mf_sync_logs for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- API Route（service role ではなく anon key）から insert するため authenticated に許可
create policy "mf_sync_logs: insert"
  on public.mf_sync_logs for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert on public.mf_sync_logs to authenticated;

create index idx_mf_sync_logs_household
  on public.mf_sync_logs(household_id, created_at desc);
