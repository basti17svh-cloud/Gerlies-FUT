-- V21.136: fail-closed transactional LIVE fulfilment (Sandbox untouched).
alter table public.footera_live_store_items
 add column if not exists fulfillment_ready boolean not null default false;
update public.footera_live_store_items set fulfillment_ready=false;

create or replace function public.footera_live_validate_delivery()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare v_item public.footera_live_store_items%rowtype;
begin
 select * into v_item from public.footera_live_store_items
  where item_key=new.item_key and enabled=true and fulfillment_ready=true
    and (available_from is null or available_from<=now())
    and (available_until is null or available_until>now());
 if not found then raise exception 'Live item delivery is not ready'; end if;
 if v_item.item_type is distinct from new.item_type then
   raise exception 'Live entitlement type mismatch';
 end if;
 if new.item_type='season_pass' and new.item_key='season_pass:s1' then
   new.delivery_status:='delivered';
   new.delivery_payload:=jsonb_build_object('season_key','s1','premium',true);
   new.delivered_at:=now();
 else
   -- No money/Points can leave the wallet until a server-owned card inventory
   -- and exact pack draw with reliable cross-device restoration are deployed.
   raise exception 'Live item fulfillment not implemented';
 end if;
 return new;
end;
$$;
revoke all on function public.footera_live_validate_delivery()
 from public,anon,authenticated;
grant execute on function public.footera_live_validate_delivery()
 to service_role;
drop trigger if exists footera_live_delivery_before_insert
 on public.footera_live_entitlements;
create trigger footera_live_delivery_before_insert
 before insert on public.footera_live_entitlements
 for each row execute function public.footera_live_validate_delivery();
