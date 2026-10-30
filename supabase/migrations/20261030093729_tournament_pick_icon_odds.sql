-- Tournament winners: 5% Icon chance per pick, at most one Icon.
-- Existing opened offers and all other reward sources are preserved.
create or replace function footera_private.open_pick(p_id uuid,p_save_id text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 u uuid:=footera_private.pick_user();
 p public.footera_player_picks%rowtype;
 offered jsonb;
 kind_needed text;
 live_count int;
begin
 select * into p from public.footera_player_picks
 where id=p_id and user_id=u and save_id=p_save_id for update;
 if not found then raise exception 'Pick nicht verfügbar.' using errcode='42501'; end if;
 if p.claimed_at is not null then raise exception 'Dieser Pick wurde bereits eingelöst.'; end if;
 if p.options is null then
   if p.source='tournament' and p.type='standard' then
     -- One roll per unopened pick. Icons cannot gain extra slots through
     -- catalogue size or the history-based variety preference below.
     with pool as materialized (
       select distinct on (catalog.item->>'pid') catalog.id,catalog.item,
         (coalesce(catalog.item->>'variant','') like 'icon%'
           or coalesce(catalog.item#>>'{baseSnapshot,isIcon}','false')='true') as is_icon
       from public.footera_pick_catalog catalog
       where catalog.kind='standard' and catalog.rating>=p.min_rating
         and catalog.starts_at<=now() and catalog.ends_at>now()
       order by catalog.item->>'pid',catalog.starts_at desc,catalog.id
     ), icon_roll as materialized (
       select random()<0.05 as include_icon
     ), icon_choice as materialized (
       select id,item from pool where is_icon and (select include_icon from icon_roll)
       order by random() limit 1
     ), gold_choices as (
       select id,item from pool where not is_icon
       order by random() limit (p.choices-(select count(*) from icon_choice))
     ), candidates as (
       select * from gold_choices union all select * from icon_choice
     )
     select jsonb_agg(jsonb_build_object('id',id,'item',item ||
       jsonb_build_object('cosmeticDesign','','tradeable',false)) order by random())
     into offered from candidates;
   else
   kind_needed:=case when p.type='champions-red' then 'special' else 'standard' end;
   select count(distinct catalog.item->>'pid') into live_count from public.footera_pick_catalog catalog
   where catalog.kind=kind_needed and catalog.rating>=p.min_rating
     and catalog.starts_at<=now() and catalog.ends_at>now();
   with previously_offered as (
     select option->>'id' as card_id,count(*) as previous_count
     from public.footera_player_picks historic
     cross join lateral jsonb_array_elements(coalesce(historic.options,'[]'::jsonb)) option
     where historic.user_id=u
       and historic.id<>p.id and historic.type=p.type
       and historic.opened_at > now()-interval '30 days'
     group by option->>'id'
   ), pool as (
     select distinct on (catalog.item->>'pid')
       catalog.id,catalog.item,catalog.ends_at>now() as live,catalog.starts_at,
       coalesce(history.previous_count,0) as seen
     from public.footera_pick_catalog catalog
     left join previously_offered history on history.card_id=catalog.id
     where catalog.kind=kind_needed and catalog.rating>=p.min_rating
       and catalog.starts_at<=now()
       and (catalog.ends_at>now() or live_count<p.choices)
     order by catalog.item->>'pid',catalog.ends_at>now() desc,catalog.starts_at desc
   ), candidates as (
     select id,item from pool
     order by live desc,case when live then null else starts_at end desc nulls first,seen asc,random()
     limit p.choices
   )
   select jsonb_agg(jsonb_build_object('id',id,'item',item ||
     jsonb_build_object('cosmeticDesign',case when p.type='champions-red' then 'red' else '' end,'tradeable',false)))
   into offered from candidates;
   end if;
   if coalesce(jsonb_array_length(offered),0)<>p.choices then
     raise exception 'Aktuell sind zu wenige berechtigte Spieler verfügbar. Dein Pick bleibt erhalten.';
   end if;
   update public.footera_player_picks set options=offered,opened_at=now()
   where id=p.id returning * into p;
 end if;
 return to_jsonb(p)-'user_id'-'selected_item';
end;
$$;
