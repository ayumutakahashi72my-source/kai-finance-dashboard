-- R-1 Phase A: カテゴリ重複統合のDry Run専用RPC。
-- 一切のUPDATE/DELETEを行わず、統合対象の集計結果のみを返す（読み取り専用）。
-- 全household横断で集計するため、通常のRLS越しのauthenticatedには実行させず、
-- service_role（運用担当者が管理スクリプト経由で実行する想定）のみに限定する。

create or replace function public.dry_run_category_dedup()
returns table (
  household_id              uuid,
  category_name             text,
  survivor_id               uuid,
  survivor_created_at       timestamptz,
  duplicate_ids             uuid[],
  duplicate_count           int,
  affected_transactions     bigint,
  affected_rag_rows         bigint,
  affected_corrections      bigint,
  affected_anomaly_flags    bigint,
  affected_child_categories bigint,
  affected_classification_logs bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with dup_groups as (
    select
      c.household_id,
      c.name as category_name,
      (array_agg(c.id order by c.created_at asc))[1] as survivor_id,
      (array_agg(c.created_at order by c.created_at asc))[1] as survivor_created_at,
      (array_agg(c.id order by c.created_at asc))[2:] as duplicate_ids,
      count(*) - 1 as duplicate_count
    from public.categories c
    group by c.household_id, c.name
    having count(*) > 1
  )
  select
    g.household_id,
    g.category_name,
    g.survivor_id,
    g.survivor_created_at,
    g.duplicate_ids,
    g.duplicate_count,
    (select count(*) from public.transactions t where t.category_id = any(g.duplicate_ids)) as affected_transactions,
    (select count(*) from public.category_rag r where r.category_id = any(g.duplicate_ids)) as affected_rag_rows,
    (select count(*) from public.category_corrections cc
       where cc.old_category_id = any(g.duplicate_ids) or cc.new_category_id = any(g.duplicate_ids)) as affected_corrections,
    (select count(*) from public.monthly_anomaly_flags maf where maf.category_id = any(g.duplicate_ids)) as affected_anomaly_flags,
    (select count(*) from public.categories child where child.parent_id = any(g.duplicate_ids)) as affected_child_categories,
    (select count(*) from public.ai_classification_logs l where l.category_id = any(g.duplicate_ids)) as affected_classification_logs
  from dup_groups g
  order by g.household_id, g.category_name;
$$;

revoke execute on function public.dry_run_category_dedup() from public;
revoke execute on function public.dry_run_category_dedup() from authenticated;
grant execute on function public.dry_run_category_dedup() to service_role;
