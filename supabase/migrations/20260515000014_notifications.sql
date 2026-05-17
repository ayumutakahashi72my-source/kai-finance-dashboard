-- =============================================
-- Phase 3b: notifications + push_subscriptions
-- =============================================

create table public.notifications (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  type         text        not null,
  payload      jsonb       not null default '{}',
  read_at      timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications: select"
  on public.notifications for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "notifications: update"
  on public.notifications for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, update on public.notifications to authenticated;

create index idx_notifications_household_unread
  on public.notifications (household_id, created_at desc)
  where read_at is null;

-- push_subscriptions: ユーザーごとのWeb Push購読情報
create table public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  endpoint     text        not null,
  p256dh       text        not null,
  auth         text        not null,
  created_at   timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: select own"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

create policy "push_subscriptions: insert own"
  on public.push_subscriptions for insert
  with check (user_id = auth.uid());

create policy "push_subscriptions: delete own"
  on public.push_subscriptions for delete
  using (user_id = auth.uid());

grant select, insert, delete on public.push_subscriptions to authenticated;
