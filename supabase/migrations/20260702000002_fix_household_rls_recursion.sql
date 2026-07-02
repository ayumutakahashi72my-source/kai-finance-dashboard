-- 【緊急修正】households ⇄ household_members のRLS相互参照による無限再帰を解消する。
--
-- 経緯:
--   week3 (20260515000003) の household_members ポリシーは households を参照しており、
--   コメントで「households 側から household_members を参照すると相互再帰になる」と
--   警告していた。しかし 20260701000001 で追加した
--   "households: select by member" / "households: update by member" が
--   household_members を参照したため相互再帰が成立し、適用した瞬間から
--   household_members / households に触る全クエリが
--   「infinite recursion detected in policy」で失敗するようになった
--   （requireAuth が世帯を解決できず、全ユーザーがオンボーディング画面に落ちる）。
--
-- 解法:
--   RLSポリシー内のクロステーブル参照を SECURITY DEFINER 関数に置き換える。
--   関数内のクエリは所有者権限で実行されRLSを通らないため、再帰が断ち切れる
--   （Supabase公式が案内している標準パターン）。
--
-- このファイルは冪等（DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION）。

-- ── ヘルパー関数 ───────────────────────────────────────────────

-- 呼び出しユーザーが所属する世帯ID一覧（household_members をRLSバイパスで読む）
create or replace function public.user_household_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;

revoke all on function public.user_household_ids() from public;
grant execute on function public.user_household_ids() to authenticated;

-- 呼び出しユーザーがオーナーの世帯ID一覧（households をRLSバイパスで読む）
create or replace function public.user_owned_household_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.households where owner_id = auth.uid()
$$;

revoke all on function public.user_owned_household_ids() from public;
grant execute on function public.user_owned_household_ids() to authenticated;

-- ── households 側（20260701000001 の2本を張り替え） ─────────────

drop policy if exists "households: select by member" on public.households;
create policy "households: select by member"
  on public.households for select
  using (id in (select public.user_household_ids()));

drop policy if exists "households: update by member" on public.households;
create policy "households: update by member"
  on public.households for update
  using (id in (select public.user_household_ids()))
  with check (id in (select public.user_household_ids()));

-- ── household_members 側（week3 の4本のうち households 参照を張り替え） ──

drop policy if exists "household_members: select" on public.household_members;
create policy "household_members: select"
  on public.household_members for select
  using (
    user_id = auth.uid()
    or household_id in (select public.user_owned_household_ids())
  );

drop policy if exists "household_members: insert" on public.household_members;
create policy "household_members: insert"
  on public.household_members for insert
  with check (
    household_id in (select public.user_owned_household_ids())
  );

drop policy if exists "household_members: update" on public.household_members;
create policy "household_members: update"
  on public.household_members for update
  using (
    household_id in (select public.user_owned_household_ids())
  )
  with check (
    household_id in (select public.user_owned_household_ids())
  );

drop policy if exists "household_members: delete" on public.household_members;
create policy "household_members: delete"
  on public.household_members for delete
  using (
    user_id = auth.uid()
    or household_id in (select public.user_owned_household_ids())
  );
