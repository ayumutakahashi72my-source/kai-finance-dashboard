-- =============================================
-- Week 8: monthly_summaries / chat_sessions / chat_messages
-- =============================================

create table public.monthly_summaries (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  year         integer     not null,
  month        integer     not null,
  content      text        not null,
  created_at   timestamptz not null default now(),
  unique (household_id, year, month)
);

alter table public.monthly_summaries enable row level security;

create policy "monthly_summaries: select"
  on public.monthly_summaries for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "monthly_summaries: insert"
  on public.monthly_summaries for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert on public.monthly_summaries to authenticated;

-- チャット使用量（世帯・月ごと）
create table public.chat_sessions (
  id             uuid        primary key default gen_random_uuid(),
  household_id   uuid        not null references public.households(id) on delete cascade,
  year           integer     not null,
  month          integer     not null,
  session_count  integer     not null default 0,
  estimated_cost integer     not null default 0,  -- 円
  unique (household_id, year, month)
);

alter table public.chat_sessions enable row level security;

create policy "chat_sessions: select"
  on public.chat_sessions for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "chat_sessions: insert"
  on public.chat_sessions for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "chat_sessions: update"
  on public.chat_sessions for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert, update on public.chat_sessions to authenticated;

-- チャット履歴
create table public.chat_messages (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  year         integer     not null,
  month        integer     not null,
  role         text        not null check (role in ('user', 'assistant')),
  content      text        not null,
  created_at   timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages: select"
  on public.chat_messages for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "chat_messages: insert"
  on public.chat_messages for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert on public.chat_messages to authenticated;

create index idx_chat_messages_household_ym_created
  on public.chat_messages(household_id, year, month, created_at);
