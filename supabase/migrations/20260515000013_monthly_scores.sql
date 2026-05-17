-- =============================================
-- Phase 2: monthly_scores + fixed_expense_suggestions
-- =============================================

-- スコア永続化テーブル
create table public.monthly_scores (
  id             uuid        primary key default gen_random_uuid(),
  household_id   uuid        not null references public.households(id) on delete cascade,
  month          date        not null,   -- 月初日（例: 2026-05-01）
  score          integer     not null check (score between 0 and 100),
  budget_score   integer     not null default 0,
  saving_score   integer     not null default 0,
  bonus_score    integer     not null default 0,
  score_grade    text        check (score_grade in ('S','A','B','C','D')),
  score_detail   jsonb       not null default '{}',
  is_finalized   boolean     not null default false,
  calculated_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (household_id, month)
);

alter table public.monthly_scores enable row level security;

create policy "monthly_scores: select"
  on public.monthly_scores for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "monthly_scores: insert"
  on public.monthly_scores for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "monthly_scores: update"
  on public.monthly_scores for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert, update on public.monthly_scores to authenticated;

create index idx_monthly_scores_household_month
  on public.monthly_scores (household_id, month desc);

-- 固定費候補テーブル（SQL集計で自動検出）
create table public.fixed_expense_suggestions (
  id           uuid        primary key default gen_random_uuid(),
  household_id uuid        not null references public.households(id) on delete cascade,
  payee        text        not null,
  avg_amount   integer     not null,
  months_seen  integer     not null default 1,
  dismissed    boolean     not null default false,
  detected_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (household_id, payee)
);

alter table public.fixed_expense_suggestions enable row level security;

create policy "fixed_expense_suggestions: select"
  on public.fixed_expense_suggestions for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "fixed_expense_suggestions: insert"
  on public.fixed_expense_suggestions for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

create policy "fixed_expense_suggestions: update"
  on public.fixed_expense_suggestions for update
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant select, insert, update on public.fixed_expense_suggestions to authenticated;
