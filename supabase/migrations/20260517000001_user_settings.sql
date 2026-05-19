-- =============================================
-- user_settings: 外部サービス連携情報
-- ext_provider='mf' でMoneyForward連携
-- =============================================

create table public.user_settings (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  ext_uid      text,
  ext_secret   text,
  ext_provider text        not null default 'mf',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, ext_provider)
);

alter table public.user_settings enable row level security;

create policy "user_settings: select own"
  on public.user_settings for select
  using (user_id = auth.uid());

create policy "user_settings: insert own"
  on public.user_settings for insert
  with check (user_id = auth.uid());

create policy "user_settings: update own"
  on public.user_settings for update
  using (user_id = auth.uid());

create policy "user_settings: delete own"
  on public.user_settings for delete
  using (user_id = auth.uid());

grant select, insert, update, delete on public.user_settings to authenticated;

create index idx_user_settings_user_provider
  on public.user_settings(user_id, ext_provider);
