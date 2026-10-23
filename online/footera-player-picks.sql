-- Server-owned reward entitlements and fixed offers. No client can mint picks or supply card data.
create schema if not exists footera_private;
revoke all on schema footera_private from public,anon;
grant usage on schema footera_private to authenticated,service_role;
create table public.footera_pick_catalog (
 id text primary key, kind text not null check(kind in ('standard','special')),
 rating smallint not null check(rating between 40 and 99),
 starts_at timestamptz not null, ends_at timestamptz not null,
 item jsonb not null check(jsonb_typeof(item)='object'),
 check(ends_at>starts_at)
);
create index footera_pick_catalog_pool on public.footera_pick_catalog(kind,rating,ends_at);
create table public.footera_player_picks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 save_id text not null, source text not null, source_key text not null,
 slot smallint not null check(slot between 1 and 3),
 type text not null check(type in ('standard','champions-red')),
 choices smallint not null check(choices in (3,4)),
 min_rating smallint not null check(min_rating between 80 and 85),
 options jsonb, selected_id text, selected_item jsonb,
 created_at timestamptz not null default now(), opened_at timestamptz, claimed_at timestamptz,
 claim_revision bigint,
 unique(user_id,source,source_key,slot),
 check(options is null or (jsonb_typeof(options)='array' and jsonb_array_length(options)=choices)),
 check((selected_id is null and selected_item is null and claimed_at is null) or
       (selected_id is not null and selected_item is not null and claimed_at is not null))
);
create index footera_player_picks_owner on public.footera_player_picks(user_id,created_at);
alter table public.footera_pick_catalog enable row level security;
alter table public.footera_player_picks enable row level security;
revoke all on public.footera_pick_catalog,public.footera_player_picks from public,anon,authenticated;
grant all on public.footera_pick_catalog,public.footera_player_picks to service_role;
grant select on public.footera_player_picks to authenticated;
create policy own_picks on public.footera_player_picks for select to authenticated
 using(user_id=(select auth.uid()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,true)=false);

create function footera_private.pick_user() returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) or
 not exists(select 1 from auth.users where id=u and email_confirmed_at is not null)
 then raise exception 'Bitte mit einem bestätigten Footera-Konto anmelden.' using errcode='42501'; end if;
 return u;
end $$;

create function footera_private.list_picks(p_save_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=footera_private.pick_user(); s jsonb; r jsonb; n int; rating int; typ text; opts int; k int; wins int; divn int;
begin
 select save_data into s from public.footera_cloud_saves where user_id=u for update;
 if s#>>'{profile,saveId}' is distinct from p_save_id then raise exception 'Der Verein gehört nicht zu diesem Konto.' using errcode='42501'; end if;
 -- Competition results already live in the game's cloud save. Only server rules determine
 -- the pick count and quality; client-supplied reward definitions never set these values.
 for r in select value from jsonb_array_elements(coalesce(s->'weeklyRewards','[]')) loop
  if r->>'claimed' is distinct from 'true' or jsonb_typeof(r#>'{reward,playerPicks}') is distinct from 'array' then continue; end if;
  if jsonb_array_length(r#>'{reward,playerPicks}')=0 then continue; end if;
  n:=0; rating:=80; typ:='standard'; opts:=3;
  if r->>'mode'='champions' and coalesce(r->>'wins','') ~ '^\d{1,2}$' then
   wins:=(r->>'wins')::int;
   if wins between 5 and 15 then n:=case when wins=15 then 3 when wins>=11 then 2 else 1 end; end if;
   rating:=85; typ:='champions-red'; opts:=4;
  elsif r->>'mode'='rivals' and coalesce(r->>'division','') ~ '^[0-5]$' and r->>'milestone' in ('15','35') then
   divn:=(r->>'division')::int;n:=1;rating:=case when divn<=2 then 84 else 82 end;
  elsif r->>'mode'='squad' and r->>'rank' in ('Gold 2','Gold 1','Elite 3','Elite 2','Elite 1') then
   n:=1;rating:=case when r->>'rank'='Elite 1' then 83 else 80 end;
  end if;
  if n=0 or coalesce(r->>'week','') !~ '^\d{13}$' then continue; end if;
  for k in 1..n loop
   insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
   values(u,p_save_id,r->>'mode',r->>'week',k,typ,opts,rating)
   on conflict(user_id,source,source_key,slot) do nothing;
  end loop;
 end loop;
 return coalesce((select jsonb_agg(to_jsonb(p)-'user_id'-'selected_item' order by created_at,id)
  from public.footera_player_picks p where user_id=u and save_id=p_save_id and claimed_at is null),'[]');
end $$;

create function footera_private.open_pick(p_id uuid,p_save_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=footera_private.pick_user(); p public.footera_player_picks%rowtype; offered jsonb;
begin
 select * into p from public.footera_player_picks where id=p_id and user_id=u and save_id=p_save_id for update;
 if not found then raise exception 'Pick nicht verfügbar.' using errcode='42501'; end if;
 if p.claimed_at is not null then raise exception 'Dieser Pick wurde bereits eingelöst.'; end if;
 if p.options is null then
  select jsonb_agg(jsonb_build_object('id',c.id,'item',c.item ||
   jsonb_build_object('cosmeticDesign',case when p.type='champions-red' then 'red' else '' end,'tradeable',false)))
  into offered from (select * from public.footera_pick_catalog
   where kind=case when p.type='champions-red' then 'special' else 'standard' end
   and rating>=p.min_rating and starts_at<=now() and ends_at>now()
   order by -ln(greatest(random(),0.0000001))/power(2,greatest(0,90-rating)) limit p.choices) c;
  if coalesce(jsonb_array_length(offered),0)<>p.choices then
   raise exception 'Aktuell sind zu wenige berechtigte Spieler verfügbar. Dein Pick bleibt erhalten.';
  end if;
  update public.footera_player_picks set options=offered,opened_at=now() where id=p.id returning * into p;
 end if;
 return to_jsonb(p)-'user_id'-'selected_item';
end $$;

create function footera_private.choose_pick(p_id uuid,p_option text,p_save jsonb,p_base_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=footera_private.pick_user(); p public.footera_player_picks%rowtype; c public.footera_cloud_saves%rowtype;
 item jsonb; updated jsonb; destination text:='club'; rev bigint;
begin
 select * into c from public.footera_cloud_saves where user_id=u for update;
 select * into p from public.footera_player_picks where id=p_id and user_id=u for update;
 if not found or p.save_id is distinct from p_save#>>'{profile,saveId}' or p.save_id is distinct from c.save_data#>>'{profile,saveId}'
 then raise exception 'Pick und Verein gehören nicht zu diesem Konto.' using errcode='42501'; end if;
 if p.claimed_at is not null then
  if p.selected_id is distinct from p_option then raise exception 'Dieser Pick wurde bereits anders eingelöst.'; end if;
  if p.claim_revision is distinct from p_base_revision+1 or c.revision is distinct from p.claim_revision then
   raise exception 'Der Pick ist bereits im Cloud-Verein. Bitte den aktuellen Cloud-Spielstand laden.' using errcode='40001';
  end if;
  return jsonb_build_object('item',p.selected_item,'save_data',c.save_data,'revision',c.revision,'pick_id',p.id);
 end if;
 if c.revision is distinct from p_base_revision then raise exception 'Cloud-Spielstand wurde auf einem anderen Gerät geändert. Bitte neu laden.' using errcode='40001'; end if;
 select value->'item' into item from jsonb_array_elements(p.options) where value->>'id'=p_option;
 if item is null then raise exception 'Bitte einen der angebotenen Spieler wählen.' using errcode='22023'; end if;
 item:=item||jsonb_build_object('uid',p.id,'tradeable',false,'acquired',floor(extract(epoch from now())*1000),
   'acquisitionSource','reward-pick','playerPickId',p.id);
 updated:=p_save;
 -- Keep untradeable duplicates in SBC storage, preserving the existing card.
 if exists(select 1 from jsonb_array_elements(coalesce(updated->'club','[]')) x
  where x->>'pid'=item->>'pid' and coalesce(x->>'variant','')=coalesce(item->>'variant','')
    and coalesce(x->>'eventName','')=coalesce(item->>'eventName','')
    and coalesce(x->>'cosmeticDesign','')=coalesce(item->>'cosmeticDesign','')) then destination:='sbcStorage'; end if;
 if destination='sbcStorage' and jsonb_array_length(coalesce(updated->'sbcStorage','[]'))>=100 then raise exception 'Dein SBC-Speicher ist voll. Bitte zuerst Platz schaffen.'; end if;
 updated:=jsonb_set(updated,array[destination],coalesce(updated->destination,'[]')||jsonb_build_array(item),true);
 updated:=jsonb_set(updated,'{playerPickClaims}',coalesce(updated->'playerPickClaims','{}')||jsonb_build_object(p.id::text,p_option),true);
 rev:=public.footera_store_cloud_save(updated,p_base_revision);
 update public.footera_player_picks set selected_id=p_option,selected_item=item,claimed_at=now(),claim_revision=rev where id=p.id;
 return jsonb_build_object('item',item,'save_data',updated,'revision',rev,'pick_id',p.id);
end $$;

-- Exposed wrappers use caller privileges; privileged bodies live outside the API schema.
create function public.footera_list_player_picks(p_save_id text) returns jsonb language sql security invoker set search_path='' as $$select footera_private.list_picks(p_save_id)$$;
create function public.footera_open_player_pick(p_id uuid,p_save_id text) returns jsonb language sql security invoker set search_path='' as $$select footera_private.open_pick(p_id,p_save_id)$$;
create function public.footera_choose_player_pick(p_id uuid,p_option text,p_save jsonb,p_base_revision bigint) returns jsonb language sql security invoker set search_path='' as $$select footera_private.choose_pick(p_id,p_option,p_save,p_base_revision)$$;
revoke all on function footera_private.pick_user(),footera_private.list_picks(text),footera_private.open_pick(uuid,text),footera_private.choose_pick(uuid,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function footera_private.list_picks(text),footera_private.open_pick(uuid,text),footera_private.choose_pick(uuid,text,jsonb,bigint) to authenticated;
revoke all on function public.footera_list_player_picks(text),public.footera_open_player_pick(uuid,text),public.footera_choose_player_pick(uuid,text,jsonb,bigint) from public,anon;
grant execute on function public.footera_list_player_picks(text),public.footera_open_player_pick(uuid,text),public.footera_choose_player_pick(uuid,text,jsonb,bigint) to authenticated;

-- Reuse the existing approved base catalogue; special-event cards are seeded separately.
insert into public.footera_pick_catalog(id,kind,rating,starts_at,ends_at,item)
select 'base:'||player_id,'standard',base_rating,'2000-01-01','2100-01-01',
 jsonb_build_object('pid',player_id,'baseSnapshot',card_snapshot||jsonb_build_object('id',player_id),
 'variant',case when (card_snapshot->>'isIcon')::boolean then 'icon-mid' else '' end,'displayRating',base_rating,'tradeable',false,'rare',true,'evo',0,'evoStats','{}'::jsonb)
 ||case when (card_snapshot->>'isIcon')::boolean then jsonb_build_object('eventName','Icon') else '{}'::jsonb end
from public.footera_live_player_catalog where approved_for_paid and base_rating>=80
on conflict(id) do nothing;
