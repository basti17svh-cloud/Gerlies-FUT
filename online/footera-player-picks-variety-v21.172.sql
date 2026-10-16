-- V21.172: prevent repetitive fixed selections for each account without
-- changing or re-rolling any already opened/claimed Player Pick.
-- A 7-card active pool cannot produce two fully disjoint 4-card picks,
-- so balance usage across all recently opened offers before random tie-break.
create or replace function footera_private.open_pick(p_id uuid,p_save_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 u uuid:=footera_private.pick_user();
 p public.footera_player_picks%rowtype;
 offered jsonb;
begin
 select * into p from public.footera_player_picks
 where id=p_id and user_id=u and save_id=p_save_id for update;
 if not found then raise exception 'Pick nicht verfügbar.' using errcode='42501'; end if;
 if p.claimed_at is not null then raise exception 'Dieser Pick wurde bereits eingelöst.'; end if;
 if p.options is null then
   with previously_offered as (
     select option->>'id' as card_id,count(*) as previous_count
     from public.footera_player_picks historic
     cross join lateral jsonb_array_elements(coalesce(historic.options,'[]'::jsonb)) option
     where historic.user_id=u
       and historic.id<>p.id and historic.type=p.type
       and historic.opened_at > now()-interval '30 days'
     group by option->>'id'
   ), candidates as (
     select catalog.id,catalog.item,catalog.rating,coalesce(history.previous_count,0) as seen
     from public.footera_pick_catalog catalog
     left join previously_offered history on history.card_id=catalog.id
     where catalog.kind=case when p.type='champions-red' then 'special' else 'standard' end
       and catalog.rating>=p.min_rating
       and catalog.starts_at<=now() and catalog.ends_at>now()
     order by coalesce(history.previous_count,0) asc,random()
     limit p.choices
   )
   select jsonb_agg(jsonb_build_object('id',id,'item',item ||
     jsonb_build_object('cosmeticDesign',case when p.type='champions-red' then 'red' else '' end,'tradeable',false)))
   into offered from candidates;
   if coalesce(jsonb_array_length(offered),0)<>p.choices then
     raise exception 'Aktuell sind zu wenige berechtigte Spieler verfügbar. Dein Pick bleibt erhalten.';
   end if;
   update public.footera_player_picks set options=offered,opened_at=now()
   where id=p.id returning * into p;
 end if;
 return to_jsonb(p)-'user_id'-'selected_item';
end;
$$;

-- A list request does not mutate the cloud save. Drop the unnecessary cloud
-- row lock so it cannot block concurrent reward redemptions.
do $migration$
declare old_def text;
begin
 select pg_get_functiondef('footera_private.list_picks(text)'::regprocedure) into old_def;
 if position('where user_id=u for update;' in old_def)=0 then
   raise exception 'list_picks definition changed; abort migration';
 end if;
 execute replace(old_def,'where user_id=u for update;','where user_id=u;');
end;
$migration$;
