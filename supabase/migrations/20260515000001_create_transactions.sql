-- transactions テーブル
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  amount           numeric(12, 0) not null,          -- 円単位・小数なし
  category         text not null,
  memo             text,
  transaction_date date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute procedure public.set_updated_at();

-- RLS 有効化
alter table public.transactions enable row level security;

-- ポリシー: 自分のデータのみ CRUD 可
create policy "transactions: select own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions: insert own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions: update own"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions: delete own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- インデックス
create index idx_transactions_user_date
  on public.transactions(user_id, transaction_date desc);

create index idx_transactions_user_category
  on public.transactions(user_id, category);
