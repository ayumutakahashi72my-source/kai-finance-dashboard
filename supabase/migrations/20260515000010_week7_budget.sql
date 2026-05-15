-- =============================================
-- Week 7: budget_suggestions + api_error_logs
-- =============================================

create table public.budget_suggestions (
  id               uuid        primary key default gen_random_uuid(),
  household_id     uuid        not null references public.households(id) on delete cascade,
  year             integer     not null,
  month            integer     not null,
  suggestions      jsonb       not null default '[]',
  spending_pattern jsonb       not null default '{}',
  created_at       timestamptz not null default now(),
  unique (household_id, year, month)
);

alter table public.budget_suggestions enable row level security;

create policy "budget_suggestions: select"
  on public.budget_suggestions for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "budget_suggestions: insert"
  on public.budget_suggestions for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert on public.budget_suggestions to authenticated;

create index idx_budget_suggestions_household_ym
  on public.budget_suggestions(household_id, year, month);

-- api_error_logs（AI失敗ログ・RLSなし・serviceロール不要のためauthenticatedに最小権限）
create table public.api_error_logs (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        references public.households(id) on delete cascade,
  feature      text        not null,
  error_msg    text        not null,
  payload      jsonb,
  created_at   timestamptz not null default now()
);

alter table public.api_error_logs enable row level security;

create policy "api_error_logs: insert"
  on public.api_error_logs for insert
  with check (true);

create policy "api_error_logs: select own"
  on public.api_error_logs for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert on public.api_error_logs to authenticated;
