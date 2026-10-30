-- Isolated database only. All fixtures are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000003191','odds@example.invalid',now());
delete from public.footera_pick_catalog;
insert into public.footera_pick_catalog(id,kind,rating,starts_at,ends_at,item)
select 'odds-'||i,'standard',84+i%7,now()-interval '1 day',now()+interval '1 day',
 jsonb_build_object('pid','qa-'||i,'displayRating',84+i%7,'variant',case when i>20 then 'icon-mid' else '' end,'baseSnapshot',jsonb_build_object('isIcon',i>20))
from generate_series(1,80) i;
-- Ineligible/future/expired cards must not leak into these picks.
insert into public.footera_pick_catalog(id,kind,rating,starts_at,ends_at,item) values
 ('low','standard',83,now()-interval '1 day',now()+interval '1 day','{"pid":"low"}'),
 ('future','standard',90,now()+interval '1 day',now()+interval '2 days','{"pid":"future"}'),
 ('expired','standard',90,now()-interval '2 days',now()-interval '1 day','{"pid":"expired"}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000003191","is_anonymous":false,"role":"authenticated"}',true);
select setseed(0.319);
do $$declare pid uuid;p jsonb;again jsonb;n int;icons int:=0;i int;blocked boolean;
begin
 for i in 1..1000 loop
  insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
  values('00000000-0000-4000-8000-000000003191','odds-fixture','tournament','odds-'||i,1,'standard',3,84) returning id into pid;
  p:=public.footera_open_player_pick(pid,'odds-fixture');
  if jsonb_array_length(p->'options')<>3 then raise exception 'wrong option count';end if;
  select count(*) into n from jsonb_array_elements(p->'options') o where o#>>'{item,variant}' like 'icon%';
  if n>1 then raise exception 'multiple Icons in tournament pick';end if;icons:=icons+n;
  if (select count(distinct o#>>'{item,pid}') from jsonb_array_elements(p->'options') o)<>3 then raise exception 'duplicate player';end if;
  if exists(select 1 from jsonb_array_elements(p->'options') o where coalesce((o#>>'{item,displayRating}')::int,0)<84 or o#>>'{item,tradeable}'<>'false') then raise exception 'invalid card';end if;
  again:=public.footera_open_player_pick(pid,'odds-fixture');if again->'options'<>p->'options' then raise exception 'rerolled saved offer';end if;
 end loop;
 if icons<20 or icons>90 then raise exception 'Icon frequency out of range: %/1000',icons;end if;
 raise notice 'Tournament sample: %/1000 picks contain one Icon; none contain multiple',icons;
 blocked:=false;begin perform public.footera_open_player_pick(pid,'foreign-club');exception when sqlstate '42501' then blocked:=true;end;if not blocked then raise exception 'foreign club accepted';end if;
 -- Already-opened offers stay exactly as they were, even if they have three Icons.
 update public.footera_player_picks set options='[{"id":"old1","item":{"variant":"icon-mid"}},{"id":"old2","item":{"variant":"icon-mid"}},{"id":"old3","item":{"variant":"icon-mid"}}]' where id=pid;
 p:=public.footera_open_player_pick(pid,'odds-fixture');if p#>>'{options,2,id}'<>'old3' then raise exception 'existing offer overwritten';end if;
 -- Other standard sources retain the existing variety and selection path.
 insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
 values('00000000-0000-4000-8000-000000003191','odds-fixture','rivals','control',1,'standard',3,84) returning id into pid;
 delete from public.footera_pick_catalog where coalesce(item->>'variant','') not like 'icon%';
 p:=public.footera_open_player_pick(pid,'odds-fixture');if jsonb_array_length(p->'options')<>3 then raise exception 'other source changed';end if;
 -- Too few normal cards cannot bypass the Icon cap; the unopened pick survives.
 insert into public.footera_player_picks(user_id,save_id,source,source_key,slot,type,choices,min_rating)
 values('00000000-0000-4000-8000-000000003191','odds-fixture','tournament','empty-normal',1,'standard',3,84) returning id into pid;
 blocked:=false;begin perform public.footera_open_player_pick(pid,'odds-fixture');exception when others then blocked:=true;end;
 if not blocked or (select options is not null from public.footera_player_picks where id=pid) then raise exception 'invalid offer committed';end if;
end$$;
rollback;
