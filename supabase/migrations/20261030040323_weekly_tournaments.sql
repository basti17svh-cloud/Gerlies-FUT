-- Weekly cups. Additive account-owned receipts; existing cloud reward guards remain intact.
create table footera_private.tournament_receipts(
 user_id uuid not null references auth.users(id) on delete cascade,
 cup text not null check(cup in ('bronze','silver','open')),
 week date not null,save_id text not null,revision bigint not null,pick_ids jsonb not null default '[]',
 primary key(user_id,cup,week)
);
alter table footera_private.tournament_receipts enable row level security;
revoke all on footera_private.tournament_receipts from public,anon,authenticated;
grant all on footera_private.tournament_receipts to service_role;

create function footera_private.tournament_earned(s jsonb,cup text,week_key text,at_time timestamptz)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare wins jsonb:=s#>array['tournaments',cup,week_key,'earned'];w jsonb;r jsonb;i int;
 start_ms numeric;end_ms numeric;lo int;hi int;d date;
begin
 if cup not in ('bronze','silver','open') or week_key!~'^\d{4}-\d{2}-\d{2}$' or jsonb_typeof(wins) is distinct from 'array' then return false;end if;
 d:=week_key::date;
 if d<date '2026-10-29' or extract(isodow from d)<>4 or jsonb_array_length(wins)<>3 then return false;end if;
 start_ms:=extract(epoch from ((d+time '19:00') at time zone 'Europe/Berlin'))*1000;
 end_ms:=extract(epoch from ((d+7+time '19:00') at time zone 'Europe/Berlin'))*1000;
 lo:=case when cup='silver' then 65 else 40 end;hi:=case cup when 'bronze' then 64 when 'silver' then 74 else 99 end;
 if (select count(distinct x->>'id') from jsonb_array_elements(wins) x)<>3 then return false;end if;
 for i in 1..3 loop
  w:=wins->(i-1);
  if coalesce(w->>'stage','')<>i::text or coalesce(w->>'id','')='' or length(w->>'id')>128
   or coalesce(w->>'kickoffAt','')!~'^[0-9]{13}$' or coalesce(w->>'finishedAt','')!~'^[0-9]{13}$'
   or jsonb_typeof(w->'roster') is distinct from 'array' then return false;end if;
  if jsonb_array_length(w->'roster')<>18 or (select count(distinct x->>'uid') from jsonb_array_elements(w->'roster') x)<>18 then return false;end if;
  for r in select value from jsonb_array_elements(w->'roster') loop
   if coalesce(r->>'uid','')='' or coalesce(r->>'rating','')!~'^[0-9]{2}$' then return false;end if;
   if (r->>'rating')::int not between lo and hi then return false;end if;
  end loop;
  if (w->>'kickoffAt')::numeric<start_ms or (w->>'kickoffAt')::numeric>=end_ms
   or (w->>'finishedAt')::numeric<(w->>'kickoffAt')::numeric
   or (w->>'finishedAt')::numeric>=end_ms+7200000
   or (w->>'finishedAt')::numeric>extract(epoch from at_time)*1000 then return false;end if;
  if i>1 and (w->>'kickoffAt')::numeric<(wins->(i-2)->>'finishedAt')::numeric then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function footera_private.tournament_earned(jsonb,text,text,timestamptz) from public,anon,authenticated;

create function footera_private.claim_tournament_reward(p_save_id text,p_cup text,p_week text,p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare u uuid:=footera_private.pick_user();c public.footera_cloud_saves%rowtype;r footera_private.tournament_receipts%rowtype;
 s jsonb;k text;coins int;pack text;rev bigint;pids jsonb:='[]';pid uuid;i int;d date;
begin
 if p_cup is null or p_cup not in ('bronze','silver','open') or p_week is null or p_week!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Ungültiges Turnier.' using errcode='22023';end if;
 begin d:=p_week::date;exception when invalid_datetime_format or datetime_field_overflow then raise exception 'Ungültige Turnierwoche.' using errcode='22023';end;
 if d<date '2026-10-29' or d::text<>p_week or extract(isodow from d)<>4 then raise exception 'Ungültige Turnierwoche.' using errcode='22023';end if;
 select * into c from public.footera_cloud_saves where user_id=u for update;
 if c.save_data#>>'{profile,saveId}' is distinct from p_save_id then raise exception 'Der Verein gehört nicht zu diesem Konto.' using errcode='42501';end if;
 select * into r from footera_private.tournament_receipts where user_id=u and cup=p_cup and week=p_week::date;
 k:='tournament:'||p_cup||':'||p_week;
 if found then
  if r.save_id is distinct from p_save_id then raise exception 'Die Wochenbelohnung gehört zum ursprünglichen Verein.' using errcode='42501';end if;
  return jsonb_build_object('save_id',p_save_id,'cup_id',p_cup,'week',p_week,'claim_key',k,'revision',r.revision,'cloud_revision',c.revision,'pick_ids',r.pick_ids,'replayed',true);
 end if;
 if c.revision is distinct from p_base_revision then raise exception 'Der Online-Spielstand wurde geändert. Bitte zuerst abgleichen.' using errcode='PT409';end if;
 if not footera_private.tournament_earned(c.save_data,p_cup,p_week,now()) then raise exception 'Noch kein gültiger Turniersieg gespeichert.' using errcode='22023';end if;
 s:=c.save_data;coins:=case p_cup when 'bronze' then 7500 when 'silver' then 15000 else 20000 end;
 pack:=case p_cup when 'bronze' then 'goldplayers' when 'silver' then '83x3-sbc' else null end;
 s:=jsonb_set(s,'{coins}',to_jsonb(coalesce((s->>'coins')::bigint,0)+coins));
 if pack is not null then
  s:=jsonb_set(s,'{packs}',coalesce(s->'packs','{}')||jsonb_build_object(pack,coalesce((s#>>array['packs',pack])::int,0)+2));
  for i in 1..2 loop
   s:=jsonb_set(s,'{rewardPackQueue}',coalesce(s->'rewardPackQueue','[]')||jsonb_build_array(jsonb_build_object('id',pack,'tradeable',false,'challengeClaim',k)));
  end loop;
 else
  if (select count(*) from public.footera_pick_catalog where kind='standard' and rating>=84 and starts_at<=now() and ends_at>now())<3 then raise exception 'Der Spielerpool ist noch nicht bereit. Die Belohnung bleibt erhalten.';end if;
  for i in 1..2 loop
   insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
   values(u,p_save_id,'tournament',p_cup||':'||p_week,i,'standard',3,84) returning id into pid;
   pids:=pids||to_jsonb(pid);
  end loop;
 end if;
 s:=jsonb_set(s,'{challengeClaims}',coalesce(s->'challengeClaims','{}')||jsonb_build_object(k,true));
 rev:=public.footera_store_cloud_save(s,c.revision);
 insert into footera_private.tournament_receipts(user_id,cup,week,save_id,revision,pick_ids) values(u,p_cup,p_week::date,p_save_id,rev,pids);
 return jsonb_build_object('save_id',p_save_id,'cup_id',p_cup,'week',p_week,'claim_key',k,'revision',rev,'cloud_revision',rev,'pick_ids',pids,'replayed',false);
end $$;
revoke all on function footera_private.claim_tournament_reward(text,text,text,bigint) from public,anon,authenticated;
grant execute on function footera_private.claim_tournament_reward(text,text,text,bigint) to authenticated;
create function public.footera_claim_tournament_reward(p_save_id text,p_cup text,p_week text,p_base_revision bigint)
returns jsonb language sql security invoker set search_path='' as $$select footera_private.claim_tournament_reward(p_save_id,p_cup,p_week,p_base_revision)$$;
revoke all on function public.footera_claim_tournament_reward(text,text,text,bigint) from public,anon;
grant execute on function public.footera_claim_tournament_reward(text,text,text,bigint) to authenticated;
-- Refuse installation if confirmed receipt protection is missing; do not rewrite the cloud RPC.
do $$begin
 if position('challengeClaims' in pg_get_functiondef('public.footera_store_cloud_save(jsonb,bigint)'::regprocedure))=0 then raise exception 'Cloud challenge receipt guard required';end if;
end$$;
