-- Footera V21.130: LIVE paid-spend entitlement ledger, sandbox unaffected.
-- Server-authoritative debits (service_role ONLY); all launch flags remain OFF.
create table if not exists public.footera_live_store_items (
 item_key text primary key check (item_key ~ '^[a-z0-9:_-]{2,80}$'),
 item_type text not null check (item_type in ('pack','season_pass')),
 points_cost integer not null check (points_cost > 0 and points_cost < 100000),
 enabled boolean not null default false,
 available_from timestamptz null,
 available_until timestamptz null,
 updated_at timestamptz not null default now(),
 check (available_from is null or available_until is null or available_from < available_until)
);
create table if not exists public.footera_live_point_spends (
 id uuid primary key,
 user_id uuid not null,
 item_key text not null references public.footera_live_store_items(item_key),
 item_type text not null check (item_type in ('pack','season_pass')),
 points_cost integer not null check (points_cost > 0),
 created_at timestamptz not null default now()
);
create index if not exists footera_live_point_spends_user_idx
 on public.footera_live_point_spends(user_id,created_at desc);
-- Season entitlements are unique per user+season, regardless of request ID.
create unique index if not exists footera_live_one_pass_per_user
 on public.footera_live_point_spends (user_id,item_key) where item_type='season_pass';
alter table public.footera_live_store_items enable row level security;
alter table public.footera_live_point_spends enable row level security;
revoke all on public.footera_live_store_items,public.footera_live_point_spends from public,anon,authenticated;
grant all on public.footera_live_store_items,public.footera_live_point_spends to service_role;
grant select on public.footera_live_point_spends to authenticated;
drop policy if exists footera_live_spends_owner_read on public.footera_live_point_spends;
create policy footera_live_spends_owner_read on public.footera_live_point_spends
 for select to authenticated using (user_id=(select auth.uid()));
-- No user RLS policies on the server-owned catalog; requests never choose their own price.
insert into public.footera_live_store_items(item_key,item_type,points_cost,enabled)
values
 ('pack:silver','pack',50,false),
 ('pack:gold','pack',150,false),
 ('pack:goldplayers','pack',350,false),
 ('pack:mixed6','pack',200,false),
 ('pack:primegold','pack',500,false),
 ('pack:electrum','pack',350,false),
 ('pack:raremixed','pack',300,false),
 ('pack:ultimate','pack',2500,false),
 ('pack:jumbo-rare','pack',2000,false),
 ('pack:rare-mixed','pack',300,false),
 ('pack:mega','pack',1000,false),
 ('pack:83x15','pack',3000,false),
 ('pack:84x10','pack',4000,false),
 ('season_pass:s1','season_pass',500,false)
on conflict (item_key) do nothing;

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
begin
 if p_request_id is null or p_user_id is null or p_item_key is null then
   raise exception 'Missing paid purchase parameters';
 end if;
 select * into v_item from public.footera_live_store_items
 where item_key=p_item_key and enabled=true
 and (available_from is null or available_from<=now())
 and (available_until is null or available_until>now());
 if not found then raise exception 'Live item unavailable'; end if;

 -- Claim the request ID idempotently before touching money.
 insert into public.footera_live_point_spends(id,user_id,item_key,item_type,points_cost)
 values (p_request_id,p_user_id,v_item.item_key,v_item.item_type,v_item.points_cost)
 on conflict (id) do nothing returning id into v_inserted;
 if v_inserted is null then
   select * into v_previous from public.footera_live_point_spends where id=p_request_id;
   if not found or v_previous.user_id is distinct from p_user_id or
      v_previous.item_key is distinct from p_item_key or
      v_previous.item_type is distinct from v_item.item_type or
      v_previous.points_cost is distinct from v_item.points_cost then
     raise exception 'Live purchase id reused for a different item or price';
   end if;
   select balance_points into v_balance from public.footera_live_points_wallets where user_id=p_user_id;
   return jsonb_build_object('status','already_processed','request_id',p_request_id,
      'item_key',p_item_key,'points_cost',v_item.points_cost,'balance',coalesce(v_balance,0));
 end if;

 update public.footera_live_points_wallets set
  balance_points=balance_points-v_item.points_cost,updated_at=now()
 where user_id=p_user_id and balance_points>=v_item.points_cost
 returning balance_points into v_balance;
 if not found then raise exception 'Insufficient verified live Footera Points'; end if;
 return jsonb_build_object('status','spent','request_id',p_request_id,
    'item_key',p_item_key,'points_cost',v_item.points_cost,'balance',v_balance);
end;
$$;
revoke all on function public.footera_spend_verified_live_points(uuid,uuid,text)
 from public,anon,authenticated;
grant execute on function public.footera_spend_verified_live_points(uuid,uuid,text)
 to service_role;