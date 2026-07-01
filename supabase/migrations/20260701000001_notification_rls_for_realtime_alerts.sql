-- 予算超過アラート（リアルタイム）を通常のAPIルート（anon key + ユーザーセッション）から
-- 送信できるようにするためのRLS拡張。
--
-- notifications: これまで insert 権限が無く、cron（service_role/admin client）専用だった。
-- 予算超過は取引作成のたびに判定したいため、通常のAPIルートから世帯宛の通知を挿入できるようにする。
create policy "notifications: insert"
  on public.notifications for insert
  with check (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

grant insert on public.notifications to authenticated;

-- push_subscriptions: 既存の "select own" だけだと、通常のAPIルート経由で送る場合に
-- 操作した本人以外（世帯の他メンバー）の購読が見えず、世帯全員に届けられない。
-- 世帯スコープの select を追加する（既存ポリシーとはOR結合されるため、他の用途への影響はない）。
create policy "push_subscriptions: select household"
  on public.push_subscriptions for select
  using (
    household_id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- households: 既存の select policy も owner のみ（owner_id = auth.uid()）。
-- 非ownerメンバーが settings を読めないと、通知設定PATCH時のマージ処理が
-- 既存設定を空とみなして他メンバーの設定を意図せず上書きしてしまう。
create policy "households: select by member"
  on public.households for select
  using (
    id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

-- households: 既存の update policy は owner のみ許可（owner_id = auth.uid()）。
-- 通知設定（予算超過アラート・レシート自動分類のON/OFF）は家族の誰でも変更できるべきなので、
-- 世帯メンバーによる update を追加で許可する（既存ポリシーとはOR結合）。
--
-- ただしRLSの USING/CHECK は「どの行を対象にできるか」しか制限せず「どの列を書き換えられるか」は
-- 制限しない。このポリシーだけだと非ownerメンバーが settings 以外（name・owner_id など）まで
-- 書き換えられてしまい、owner_id の書き換え＝世帯の乗っ取りが可能になってしまう。
-- そのため列レベル権限で settings 列のみに絞る（week3移行の `grant update on households` を
-- authenticated ロールについてのみ settings 限定に絞り直す。owner向けの更新経路は現状存在しない）。
create policy "households: update by member"
  on public.households for update
  using (
    id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  )
  with check (
    id in (
      select household_id from public.household_members where user_id = auth.uid()
    )
  );

revoke update on public.households from authenticated;
grant update (settings) on public.households to authenticated;
