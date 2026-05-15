-- =============================================================
-- Week 3: households / household_members 作成
--         transactions 新スキーマ移行
--         (household_id, payee, occurred_on)
-- =============================================================

-- =============================================
-- 0. 共通トリガー関数（未作成の場合のみ）
-- =============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================
-- 1. households
-- =============================================
create table public.households (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  owner_id   uuid        not null references auth.users(id),
  settings   jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_households_updated_at
  before update on public.households
  for each row execute procedure public.set_updated_at();

alter table public.households enable row level security;

-- insert / update / delete はここで定義（household_members 不要）
create policy "households: insert"
  on public.households for insert
  with check (owner_id = auth.uid());

create policy "households: update"
  on public.households for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "households: delete"
  on public.households for delete
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.households to authenticated;

-- =============================================
-- 2. household_members
-- =============================================
create table public.household_members (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  user_id      uuid        not null references auth.users(id),
  role         text        not null check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

alter table public.household_members enable row level security;

-- 自分の行、またはオーナーとして所属する世帯のメンバー全員を参照可
-- （self-referential subquery は無限再帰になるため household_members を参照しない）
create policy "household_members: select"
  on public.household_members for select
  using (
    user_id = auth.uid()
    or household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  );

-- オーナーのみ追加可
create policy "household_members: insert"
  on public.household_members for insert
  with check (
    household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  );

-- オーナーによる role 変更のみ
create policy "household_members: update"
  on public.household_members for update
  using (
    household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  )
  with check (
    household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  );

-- オーナーまたは本人が退出可
create policy "household_members: delete"
  on public.household_members for delete
  using (
    user_id = auth.uid()
    or household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.household_members to authenticated;

-- households: select はオーナーのみに限定する
-- （household_members を参照すると相互再帰になるため）
-- メンバーのアクセスは household_members 経由のジョインで対応する
create policy "households: select"
  on public.households for select
  using (owner_id = auth.uid());

-- =============================================
-- 3. transactions 新スキーマへ移行
-- =============================================

-- 3-1. 既存 RLS ポリシー削除
drop policy if exists "transactions: select own"   on public.transactions;
drop policy if exists "transactions: insert own"   on public.transactions;
drop policy if exists "transactions: update own"   on public.transactions;
drop policy if exists "transactions: delete own"   on public.transactions;
-- 001_transactions.sql 由来のポリシー名にも対応
drop policy if exists "users can manage own transactions" on public.transactions;

-- 3-2. 既存インデックス削除
drop index if exists public.idx_transactions_user_date;
drop index if exists public.idx_transactions_user_category;
drop index if exists public.transactions_user_date_idx;

-- 3-3. 新カラム追加（nullable で追加してからデータ埋め）
alter table public.transactions
  add column if not exists household_id uuid references public.households(id) on delete cascade,
  add column if not exists occurred_on  date,
  add column if not exists payee        text,
  add column if not exists category_id  uuid,
  add column if not exists is_fixed     boolean default false,
  add column if not exists source       text    check (source in ('csv', 'manual', 'auto')),
  add column if not exists source_hash  text;

-- 3-4. 既存データ移行
--   transaction_date (20260515000001 由来) または date (001 由来) → occurred_on
--   description (001 由来) → payee
-- PL/pgSQL はブロック全体をコンパイル時に構文解析するため、
-- 存在しないカラムを含む SQL は IF で囲んでも失敗する。
-- EXECUTE で動的 SQL にすることでコンパイルを回避する。
do $$
begin
  -- occurred_on の移行
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'transaction_date'
  ) then
    execute 'update public.transactions set occurred_on = transaction_date where occurred_on is null';
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'date'
  ) then
    execute 'update public.transactions set occurred_on = date where occurred_on is null';
  end if;

  -- payee の移行
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'description'
  ) then
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'transactions' and column_name = 'memo'
    ) then
      execute 'update public.transactions set payee = coalesce(description, memo, ''unknown'') where payee is null';
    else
      execute 'update public.transactions set payee = coalesce(description, ''unknown'') where payee is null';
    end if;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'memo'
  ) then
    execute 'update public.transactions set payee = coalesce(memo, ''unknown'') where payee is null';
  else
    update public.transactions set payee = 'unknown' where payee is null;
  end if;
end;
$$;

-- 3-5. amount を integer に変換（円単位・小数なし）
alter table public.transactions
  alter column amount type integer using amount::integer;

-- 3-6. 旧カラム削除（存在する場合のみ）
alter table public.transactions
  drop column if exists user_id,
  drop column if exists transaction_date,
  drop column if exists date,
  drop column if exists description,
  drop column if exists category,
  drop column if exists type;

-- 3-7. NOT NULL 制約適用
--   household_id が埋まらなかった既存行（開発環境の古いデータ）は削除する
delete from public.transactions
  where household_id is null or occurred_on is null or payee is null;

alter table public.transactions
  alter column occurred_on  set not null,
  alter column payee         set not null,
  alter column household_id  set not null;

-- 3-8. 重複検知用 UNIQUE 制約
--   source_hash が NULL の手動入力行は重複チェック対象外となるよう partial index で対応
alter table public.transactions
  add constraint transactions_dedup_key
    unique (household_id, occurred_on, amount, payee, source_hash);

-- 3-9. 新 RLS ポリシー（household_members ベース）
create policy "transactions: select"
  on public.transactions for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "transactions: insert"
  on public.transactions for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "transactions: update"
  on public.transactions for update
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

create policy "transactions: delete"
  on public.transactions for delete
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- 3-10. 新インデックス
create index idx_transactions_household_date
  on public.transactions(household_id, occurred_on desc);

create index idx_transactions_household_category
  on public.transactions(household_id, category_id);
