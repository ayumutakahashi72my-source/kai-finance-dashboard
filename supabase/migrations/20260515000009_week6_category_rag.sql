-- =============================================
-- Week 6: category_rag テーブル（AIカテゴリ分類キャッシュ）
-- =============================================

create table public.category_rag (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  payee_key    text        not null,
  category_id  uuid        not null references public.categories(id) on delete cascade,
  confidence   real        not null default 0.7,
  hit_count    integer     not null default 1,
  last_seen    date        not null default current_date,
  created_at   timestamptz not null default now(),
  unique (household_id, payee_key)
);

alter table public.category_rag enable row level security;

create policy "category_rag: select"
  on public.category_rag for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "category_rag: insert"
  on public.category_rag for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "category_rag: update"
  on public.category_rag for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "category_rag: delete"
  on public.category_rag for delete
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.category_rag to authenticated;

create index idx_category_rag_household_payee
  on public.category_rag(household_id, payee_key);
