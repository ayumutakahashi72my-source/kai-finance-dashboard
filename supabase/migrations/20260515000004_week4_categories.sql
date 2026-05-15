-- =============================================
-- Week 4: categories テーブル作成
-- =============================================

create table public.categories (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  name         text        not null,
  color        text,
  icon         text,
  is_fixed     boolean     not null default false,
  created_at   timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories: select"
  on public.categories for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "categories: insert"
  on public.categories for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "categories: update"
  on public.categories for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  )
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "categories: delete"
  on public.categories for delete
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.categories to authenticated;

create index idx_categories_household
  on public.categories(household_id);
