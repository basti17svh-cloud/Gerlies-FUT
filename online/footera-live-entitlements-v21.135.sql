-- Footera V21.135 – atomic server receipt for every LIVE-Points purchase.
-- No paid content is delivered from the browser. All catalogue items stay disabled.
-- This migration does not create Stripe sessions, enable endpoints, or touch Sandbox data.
create table if not exists public.footera_live_entitlements (
  spend_id uuid primary key references public.footera_live_point_spends(id) on delete restrict,
  user_id uuid not null,
  item_key text not null references public.footera_live_store_items(item_key),
  item_type text not null check (item_type in ('pack','season_pass','evolution')),
  delivery_status text not null default 'pending'
    check (delivery_status in ('pending','delivered','void')),
  delivery_payload jsonb,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint footera_live_entitlement_delivery_consistency check (
    (delivery_status = 'pending' and delivery_payload is null and delivered_at is null)
    or (delivery_status = 'delivered' and delivery_payload is not null and delivered_at is not null)
    or (delivery_status = 'void' and delivered_at is null)
  )
);
create index if not exists footera_live_entitlement_owner_idx
  on public.footera_live_entitlements(user_id,created_at desc);
alter table public.footera_live_entitlements enable row level security;
revoke all on public.footera_live_entitlements from public,anon,authenticated;
grant all on public.footera_live_entitlements to service_role;
grant select on public.footera_live_entitlements to authenticated;
drop policy if exists footera_live_entitlement_owner_read on public.footera_live_entitlements;
create policy footera_live_entitlement_owner_read
  on public.footera_live_entitlements for select to authenticated
  using (
    user_id = (select auth.uid())
    and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  );

-- Evolution catalogue entries are prepared but unavailable until individually
-- priced, versioned and approved. Never accept a Points price from the browser.
alter table public.footera_live_store_items
  drop constraint if exists footera_live_store_items_item_type_check;
alter table public.footera_live_store_items
  add constraint footera_live_store_items_item_type_check
  check (item_type in ('pack','season_pass','evolution'));
alter table public.footera_live_point_spends
  drop constraint if exists footera_live_point_spends_item_type_check;
alter table public.footera_live_point_spends
  add constraint footera_live_point_spends_item_type_check
  check (item_type in ('pack','season_pass','evolution'));

-- All stored Entitlements must match the paid receipt. The function is
-- deliberately service_role-only; no browser can mint a receipt.
create or replace function public.footera_spend_verified_live_points(
 p_request_id uuid,p_user_id uuid,p_item_key text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 v_item public.footera_live_store_items%rowtype;
 v_previous public.footera_live_point_spends%rowtype;
 v_inserted uuid;
 v_balance bigint;
 v_status text;
begin
 if p_request_id is null or p_user_id is null or p_item_key is null then
   raise exception 'Missing paid purchase parameters';
 end if;

 -- An already committed request is idempotent even if the catalogue has
 -- subsequently closed or its price changed. Its original receipt wins.
 select * into v_previous from public.footera_live_point_spends
   where id=p_request_id;
 if found then
   if v_previous.user_id is distinct from p_user_id or
      v_previous.item_key is distinct from p_item_key then
     raise exception 'Live purchase id reused for a different user or item';
   end if;
   select delivery_status into v_status from public.footera_live_entitlements
      where spend_id=p_request_id and user_id=p_user_id;
   if not found then raise exception 'Paid receipt missing for previous spend'; end if;
   select balance_points into v_balance from public.footera_live_points_wallets
      where user_id=p_user_id;
   return jsonb_build_object('status','already_processed',
     'request_id',p_request_id,'item_key',v_previous.item_key,
     'points_cost',v_previous.points_cost,'balance',coalesce(v_balance,0),
     'delivery_status',v_status);
 end if;

 select * into v_item from public.footera_live_store_items
   where item_key=p_item_key and enabled=true
   and (available_from is null or available_from<=now())
   and (available_until is null or available_until>now());
 if not found then raise exception 'Live item unavailable'; end if;

 insert into public.footera_live_point_spends(id,user_id,item_key,item_type,points_cost)
 values (p_request_id,p_user_id,v_item.item_key,v_item.item_type,v_item.points_cost)
 on conflict (id) do nothing returning id into v_inserted;
 if v_inserted is null then
   select * into v_previous from public.footera_live_point_spends
      where id=p_request_id;
   if not found or v_previous.user_id is distinct from p_user_id or
      v_previous.item_key is distinct from p_item_key or
      v_previous.item_type is distinct from v_item.item_type or
      v_previous.points_cost is distinct from v_item.points_cost then
     raise exception 'Live purchase id reused for a different item or price';
   end if;
   select delivery_status into v_status from public.footera_live_entitlements
      where spend_id=p_request_id and user_id=p_user_id;
   if not found then raise exception 'Paid receipt missing for previous spend'; end if;
   select balance_points into v_balance from public.footera_live_points_wallets
      where user_id=p_user_id;
   return jsonb_build_object('status','already_processed',
     'request_id',p_request_id,'item_key',p_item_key,
     'points_cost',v_previous.points_cost,'balance',coalesce(v_balance,0),
     'delivery_status',v_status);
 end if;

 update public.footera_live_points_wallets
   set balance_points=balance_points-v_item.points_cost, updated_at=now()
   where user_id=p_user_id and balance_points>=v_item.points_cost
   returning balance_points into v_balance;
 if not found then raise exception 'Insufficient verified live Footera Points'; end if;

 -- A successful debit and its server-owned delivery claim are atomic.
 -- Delivery remains pending until trusted game-server fulfilment exists.
 insert into public.footera_live_entitlements(
    spend_id,user_id,item_key,item_type,delivery_status
 ) values(p_request_id,p_user_id,v_item.item_key,v_item.item_type,'pending');

 return jsonb_build_object('status','spent','request_id',p_request_id,
    'item_key',p_item_key,'points_cost',v_item.points_cost,'balance',v_balance,
    'delivery_status','pending');
end;
$$;
revoke all on function public.footera_spend_verified_live_points(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.footera_spend_verified_live_points(uuid,uuid,text)
 to service_role;
