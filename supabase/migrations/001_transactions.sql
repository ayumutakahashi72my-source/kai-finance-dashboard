create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  description text not null,
  category    text not null check (category in ('food','transport','entertainment','utility','health','other')),
  type        text not null check (type in ('expense','income')),
  date        date not null,
  created_at  timestamptz not null default now()
);

alter table transactions enable row level security;

create policy "users can manage own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index transactions_user_date_idx on transactions(user_id, date desc);

-- anon key 経由のリクエストでも authenticated ロールが操作できるよう権限付与
grant select, insert, update, delete on table transactions to authenticated;
