-- Footera V21.132: prevent anonymous sessions from reading LIVE wallet/spend history.
drop policy if exists footera_live_wallet_owner_select on public.footera_live_points_wallets;
create policy footera_live_wallet_owner_select
 on public.footera_live_points_wallets for select to authenticated
 using (
  user_id=(select auth.uid())
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
 );
drop policy if exists footera_live_spends_owner_read on public.footera_live_point_spends;
create policy footera_live_spends_owner_read
 on public.footera_live_point_spends for select to authenticated
 using (
  user_id=(select auth.uid())
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
 );