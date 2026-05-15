-- =============================================
-- Week 5: category_id FK + デフォルトカテゴリ自動生成
-- =============================================

-- 1. transactions.category_id → categories FK
alter table public.transactions
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.categories(id) on delete set null;

-- 2. 世帯作成時にデフォルトカテゴリを挿入するトリガー関数
create or replace function public.seed_default_categories()
returns trigger language plpgsql security definer as $$
begin
  insert into public.categories (household_id, name, color, icon, is_fixed) values
    (new.id, '食費',       '#5eead4', '🍱', true),
    (new.id, '交通費',     '#22d3ee', '🚃', true),
    (new.id, '日用品',     '#a78bfa', '🛒', true),
    (new.id, '光熱費',     '#fbbf24', '💡', true),
    (new.id, '医療・健康', '#4ade80', '💊', true),
    (new.id, '外食',       '#f97316', '🍜', false),
    (new.id, '娯楽',       '#ec4899', '🎮', false),
    (new.id, '収入',       '#86efac', '💰', false),
    (new.id, 'その他',     '#8b8ba0', '📌', false);
  return new;
end;
$$;

create trigger trg_seed_default_categories
  after insert on public.households
  for each row execute procedure public.seed_default_categories();
