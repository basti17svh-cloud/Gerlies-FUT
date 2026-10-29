-- Additive cup rewards. No changes to existing saves, offers or competition rules.
create table footera_private.halloween_cup_pool(
 pid text primary key, option jsonb not null check(jsonb_typeof(option)='object')
);
create table footera_private.halloween_cup_receipts(
 user_id uuid not null references auth.users(id) on delete cascade,
 stage smallint not null check(stage between 1 and 3),
 save_id text not null, revision bigint not null, pick_id uuid,
 primary key(user_id,stage)
);
alter table footera_private.halloween_cup_pool enable row level security;
alter table footera_private.halloween_cup_receipts enable row level security;
revoke all on footera_private.halloween_cup_pool,footera_private.halloween_cup_receipts from public,anon,authenticated;
grant all on footera_private.halloween_cup_pool,footera_private.halloween_cup_receipts to service_role;

-- Pure validation is separate so release boundaries can be tested with a fixed clock.
create function footera_private.halloween_cup_earned(s jsonb,stage int,at_time timestamptz)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare wins jsonb:=s#>'{eventChallenges,halloween-team1,wins}'; w jsonb; i int;
 start_ms numeric:=1793383200000; end_ms numeric:=1793988000000;
begin
 if stage is null or stage not between 1 and 3 or jsonb_typeof(wins) is distinct from 'array' then return false; end if;
 if jsonb_array_length(wins)<stage or jsonb_array_length(wins)>3 then return false; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(wins) x)<>jsonb_array_length(wins) then return false; end if;
 for i in 1..stage loop
  w:=wins->(i-1);
  if coalesce(w->>'stage','')<>i::text or coalesce(w->>'id','')='' or length(w->>'id')>128
    or coalesce(w->>'kickoffAt','')!~'^[0-9]{13}$' or coalesce(w->>'finishedAt','')!~'^[0-9]{13}$' then return false; end if;
  if (w->>'kickoffAt')::numeric<start_ms or (w->>'kickoffAt')::numeric>=end_ms
    or (w->>'finishedAt')::numeric<(w->>'kickoffAt')::numeric
    or (w->>'finishedAt')::numeric>=end_ms+7200000
    or (w->>'finishedAt')::numeric>extract(epoch from at_time)*1000 then return false; end if;
  if i>1 and (w->>'kickoffAt')::numeric<(wins->(i-2)->>'finishedAt')::numeric then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function footera_private.halloween_cup_earned(jsonb,int,timestamptz) from public,anon,authenticated;

create function footera_private.claim_halloween_cup_reward(p_save_id text,p_stage int,p_base_revision bigint)
returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare u uuid:=footera_private.pick_user(); c public.footera_cloud_saves%rowtype;
 receipt footera_private.halloween_cup_receipts%rowtype; s jsonb; key text; offered jsonb; pick uuid; rev bigint;
begin
 if p_stage is null or p_stage not between 1 and 3 then raise exception 'Ungültige Cup-Runde.' using errcode='22023'; end if;
 select * into c from public.footera_cloud_saves where user_id=u for update;
 if c.save_data#>>'{profile,saveId}' is distinct from p_save_id then raise exception 'Der Verein gehört nicht zu diesem Konto.' using errcode='42501'; end if;
 select * into receipt from footera_private.halloween_cup_receipts where user_id=u and stage=p_stage;
 if found then
  if receipt.save_id is distinct from p_save_id then raise exception 'Die Belohnung wurde bereits für deinen ursprünglichen Verein vergeben.' using errcode='42501'; end if;
  return jsonb_build_object('save_id',p_save_id,'stage',p_stage,'revision',receipt.revision,'cloud_revision',c.revision,'pick_id',receipt.pick_id,'replayed',true);
 end if;
 if c.revision is distinct from p_base_revision then raise exception 'Der Online-Spielstand wurde geändert. Bitte zuerst abgleichen.' using errcode='PT409'; end if;
 if not footera_private.halloween_cup_earned(c.save_data,p_stage,now()) then raise exception 'Für diese Runde ist noch kein gültiger Sieg gespeichert.' using errcode='22023'; end if;
 s:=c.save_data; key:='halloween-team1:'||p_stage;
 if p_stage=1 then s:=jsonb_set(s,'{coins}',to_jsonb(coalesce((s->>'coins')::bigint,0)+15000)); end if;
 if p_stage=2 then
  s:=jsonb_set(s,'{packs}',coalesce(s->'packs','{}')||jsonb_build_object('reward-82-15',coalesce((s#>>'{packs,reward-82-15}')::int,0)+1));
  s:=jsonb_set(s,'{rewardPackQueue}',coalesce(s->'rewardPackQueue','[]')||jsonb_build_array(jsonb_build_object('id','reward-82-15','tradeable',false,'challengeClaim',key)));
 end if;
 if p_stage=3 then
  -- Snapshot three distinct players now. Expiry or Team 2 cannot change this offer.
  if (select count(*) from footera_private.halloween_cup_pool)<>18 then raise exception 'Der vollständige Team-1-Pool ist noch nicht bereit. Deine Belohnung bleibt erhalten.'; end if;
  select jsonb_agg(option) into offered from (select option from footera_private.halloween_cup_pool order by random() limit 3) x;
  insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating,options)
  values(u,p_save_id,'halloween-cup','halloween-team1',1,'standard',3,84,offered)
  returning id into pick;
 end if;
 s:=jsonb_set(s,'{challengeClaims}',coalesce(s->'challengeClaims','{}')||jsonb_build_object(key,true));
 rev:=public.footera_store_cloud_save(s,c.revision);
 insert into footera_private.halloween_cup_receipts(user_id,stage,save_id,revision,pick_id) values(u,p_stage,p_save_id,rev,pick);
 return jsonb_build_object('save_id',p_save_id,'stage',p_stage,'revision',rev,'cloud_revision',rev,'pick_id',pick,'replayed',false);
end $$;
revoke all on function footera_private.claim_halloween_cup_reward(text,int,bigint) from public,anon,authenticated;
grant execute on function footera_private.claim_halloween_cup_reward(text,int,bigint) to authenticated;
create function public.footera_claim_halloween_cup_reward(p_save_id text,p_stage int,p_base_revision bigint)
returns jsonb language sql security invoker set search_path='' as $$
 select footera_private.claim_halloween_cup_reward(p_save_id,p_stage,p_base_revision)
$$;
revoke all on function public.footera_claim_halloween_cup_reward(text,int,bigint) from public,anon;
grant execute on function public.footera_claim_halloween_cup_reward(text,int,bigint) to authenticated;

-- An older device may not erase a confirmed cup delivery, including via force-save.
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.footera_store_cloud_save(jsonb,bigint)'::regprocedure) into definition;
 if length(definition)-length(replace(definition,'if v_previous is not null then',''))<>length('if v_previous is not null then')
   or position('playerPickClaims' in definition)=0 or position('paidPackClaims' in definition)=0
   or position('where user_id=v_user for update;' in definition)=0
   or position('revision=p_base_revision' in definition)=0
 then raise exception 'Cloud guard changed; review before applying'; end if;
 definition:=replace(definition,'if v_previous is not null then','if v_previous is not null then
    if not (coalesce(p_save->''challengeClaims'',''{}''::jsonb) @> coalesce(v_previous->''challengeClaims'',''{}''::jsonb)) then
      raise exception ''Bestätigte Cup-Belohnungen fehlen. Bitte zuerst den Online-Stand abgleichen.'' using errcode=''PT409'';
    end if;');
 execute definition;
end $patch$;
