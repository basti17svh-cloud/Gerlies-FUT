-- Footera V21.137 - authoritative paid-card inventory STAGING ONLY; no LIVE packs enabled.
-- Pack specs captured from main/index.html at blob 64a9a4747e0ed6c9be34e942bd2dbb5db2e2a043.
-- Never mint paid cards from browser-submitted player data, draws, or local saves.
create table if not exists public.footera_live_player_catalog (
  player_id text primary key check (length(player_id) between 1 and 100),
  catalog_version text not null check (length(catalog_version) between 3 and 80),
  base_rating smallint not null check (base_rating between 40 and 99),
  card_snapshot jsonb not null check (
    jsonb_typeof(card_snapshot)='object'
    and pg_column_size(card_snapshot)<=16384),
  approved_for_paid boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.footera_live_pack_specs (
  item_key text primary key references public.footera_live_store_items(item_key),
  spec_version text not null,
  points_cost integer not null check (points_cost>0),
  player_count smallint not null check (player_count between 1 and 30),
  composition jsonb not null check (jsonb_typeof(composition)='array'),
  guaranteed_rating smallint not null default 0 check (guaranteed_rating between 0 and 99),
  rare_count smallint not null default 0 check (rare_count between 0 and 30),
  icon_probability numeric(10,8) not null default 0 check (icon_probability between 0 and 1),
  extra_slots jsonb,
  daily_limit smallint,
  reset_hour smallint,
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.footera_live_point_spends
  add constraint footera_live_spend_card_owner_unique unique(id,user_id,item_key);
create table if not exists public.footera_live_cards (
  card_id uuid primary key default gen_random_uuid(),
  spend_id uuid not null,
  user_id uuid not null,
  item_key text not null,
  slot smallint not null check (slot between 0 and 29),
  player_id text not null references public.footera_live_player_catalog(player_id),
  card_snapshot jsonb not null check (jsonb_typeof(card_snapshot)='object'),
  tradeable boolean not null default false,
  created_at timestamptz not null default now(),
  constraint footera_live_card_purchase_owner_fk
    foreign key(spend_id,user_id,item_key)
    references public.footera_live_point_spends(id,user_id,item_key) on delete restrict,
  constraint footera_live_card_one_per_slot unique(spend_id,slot),
  constraint footera_live_cards_no_unauthorized_trading check (tradeable=false)
);
create index if not exists footera_live_cards_owner_idx
 on public.footera_live_cards(user_id,created_at desc);
alter table public.footera_live_cards enable row level security;
alter table public.footera_live_pack_specs enable row level security;
alter table public.footera_live_player_catalog enable row level security;
revoke all on public.footera_live_cards,public.footera_live_pack_specs,public.footera_live_player_catalog
 from public,anon,authenticated;
grant all on public.footera_live_cards,public.footera_live_pack_specs,public.footera_live_player_catalog
 to service_role;
grant select on public.footera_live_cards to authenticated;
create policy footera_live_cards_owner_read on public.footera_live_cards
 for select to authenticated using (
  user_id=(select auth.uid())
  and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
);
-- All card-creation requests must be anchored to a paid pack and approved catalog.
-- These are guards only: no pack-fulfilment RPC is exposed or enabled.
create or replace function public.footera_live_validate_card()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_type text; v_max_slots smallint; v_base public.footera_live_player_catalog%rowtype;
begin
 select item_type into v_type from public.footera_live_point_spends
   where id=new.spend_id and user_id=new.user_id and item_key=new.item_key;
 if v_type is distinct from 'pack' then raise exception 'Card requires owned LIVE pack spend'; end if;
 select player_count into v_max_slots from public.footera_live_pack_specs
   where item_key=new.item_key and enabled=true;
 if v_max_slots is null or new.slot>=v_max_slots
 then raise exception 'Verified LIVE pack specification unavailable or slot out of bounds'; end if;
 select * into v_base from public.footera_live_player_catalog
   where player_id=new.player_id and approved_for_paid=true;
 if not found then raise exception 'Paid player not approved in server catalog'; end if;
 -- Disallow arbitrary client-side card attributes or future server call mistakes.
 new.tradeable:=false;
 new.card_snapshot:=v_base.card_snapshot ||
    jsonb_build_object('uid',new.card_id,'pid',new.player_id,'tradeable',false,
      'acquisitionSource','stripe-live');
 return new;
end; $$;
revoke all on function public.footera_live_validate_card() from public,anon,authenticated;
grant execute on function public.footera_live_validate_card() to service_role;
create trigger footera_live_card_before_insert
 before insert on public.footera_live_cards
 for each row execute function public.footera_live_validate_card();
-- Publish exact current game pack specs in a disabled catalogue (no paid player catalog seeded).
insert into public.footera_live_pack_specs(item_key,spec_version,points_cost,player_count,
 composition,guaranteed_rating,rare_count,icon_probability,extra_slots,daily_limit,reset_hour,enabled)
values
 ('pack:silver','v21.137',50,5,'[{"count":5,"min":65,"max":74}]'::jsonb,0,0,0,null,null,null,false),
 ('pack:gold','v21.137',150,5,'[{"count":5,"min":75,"max":99}]'::jsonb,0,0,0.0002,null,null,null,false),
 ('pack:goldplayers','v21.137',350,12,'[{"quality":"gold","count":12,"min":75,"max":99}]'::jsonb,82,3,0.0015,null,10,19,false),
 ('pack:mixed6','v21.137',200,6,'[{"quality":"gold","count":3,"min":75,"max":99},{"quality":"silver","count":2,"min":65,"max":74},{"quality":"bronze","count":1,"min":0,"max":64}]'::jsonb,81,3,0.001,null,10,19,false),
 ('pack:primegold','v21.137',500,12,'[{"quality":"gold","count":12,"min":75,"max":99}]'::jsonb,82,6,0.0017,null,10,19,false),
 ('pack:electrum','v21.137',350,12,'[{"quality":"gold","count":6,"min":75,"max":99},{"quality":"silver","count":6,"min":65,"max":74}]'::jsonb,81,6,0.0012,null,10,19,false),
 ('pack:raremixed','v21.137',300,12,'[{"quality":"gold","count":4,"min":75,"max":99},{"quality":"silver","count":4,"min":65,"max":74},{"quality":"bronze","count":4,"min":0,"max":64}]'::jsonb,81,6,0.001,null,10,19,false),
 ('pack:ultimate','v21.137',2500,30,'[{"quality":"gold","count":30,"min":75,"max":99}]'::jsonb,84,30,0.004,null,10,19,false),
 ('pack:jumbo-rare','v21.137',2000,24,'[{"quality":"gold","count":24,"min":75,"max":99}]'::jsonb,83,24,0.003,null,10,19,false),
 ('pack:rare-mixed','v21.137',300,12,'[{"quality":"gold","count":4,"min":75,"max":99},{"quality":"silver","count":4,"min":65,"max":74},{"quality":"bronze","count":4,"min":0,"max":64}]'::jsonb,81,12,0.001,null,10,19,false),
 ('pack:mega','v21.137',1000,12,'[{"quality":"gold","count":12,"min":75,"max":99}]'::jsonb,82,6,0.002,'{"slots":2,"chance":1}'::jsonb,20,19,false),
 ('pack:83x15','v21.137',3000,15,'[{"quality":"gold","count":15,"min":83,"max":99}]'::jsonb,83,15,0.0025,null,7,19,false),
 ('pack:84x10','v21.137',4000,10,'[{"quality":"gold","count":10,"min":84,"max":99}]'::jsonb,84,10,0.003,null,5,19,false)
on conflict(item_key) do nothing;
