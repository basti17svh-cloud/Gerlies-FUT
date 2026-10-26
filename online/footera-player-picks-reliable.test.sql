-- Real database regression: real numeric wins/weeks, rank III, retries, ownership.
-- All test records roll back; no existing player saves are modified.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000002781','picks-278@example.invalid',now()),
 ('00000000-0000-4000-8000-000000002782','picks-other-278@example.invalid',now());
insert into public.footera_cloud_saves(user_id,save_data,revision)
select '00000000-0000-4000-8000-000000002781',jsonb_build_object(
 'version',128,'profile',jsonb_build_object('saveId','picks-278'),'coins',0,'points',0,'club','[]'::jsonb,'squad','[]'::jsonb,
 'weeklyRewards','[
 {"mode":"champions","week":"1792774800000","wins":11,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"1792170000000","wins":12,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"1791565200000","wins":15,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"1790960400000","wins":11,"claimed":false,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"bad-week","wins":11,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"1790355600000","wins":"invalid","claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"champions","week":"1789750800000","wins":4,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"rivals","week":"1792774800000","division":3,"milestone":35,"claimed":true,"reward":{"playerPicks":[{}]}},
 {"mode":"squad","week":"1792774800000","rank":"Gold 1","claimed":true,"reward":{"playerPicks":[{}]}}
 ]'::jsonb),1;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002781","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$
declare first_list jsonb; second_list jsonb; denied boolean:=false;
begin
 first_list:=public.footera_list_player_picks('picks-278');
 if jsonb_array_length(first_list)<>9 then raise exception 'Expected 9 total picks, got %',jsonb_array_length(first_list); end if;
 if (select count(*) from jsonb_array_elements(first_list) p where p->>'source'='champions' and p->>'source_key'='1792774800000' and p->>'min_rating'='85' and p->>'choices'='4')<>2 then
  raise exception '11-win Rank III must issue exactly two 85+ 1-of-4 picks'; end if;
 if (select count(*) from jsonb_array_elements(first_list) p where p->>'source'='champions' and p->>'source_key'='1792170000000')<>2 then
  raise exception '12-win Rank III must issue exactly two picks'; end if;
 second_list:=public.footera_list_player_picks('picks-278');
 if first_list<>second_list then raise exception 'Retry duplicated entitlements'; end if;
 -- Recover only a missing slot, retaining the other original entitlement.
 reset role;
 delete from public.footera_player_picks where user_id='00000000-0000-4000-8000-000000002781' and source='champions' and source_key='1792774800000' and slot=2;
 set local role authenticated;
 second_list:=public.footera_list_player_picks('picks-278');
 if jsonb_array_length(second_list)<>9 then raise exception 'Missing slot not recovered'; end if;
 if not exists(select 1 from jsonb_array_elements(second_list) p where p->>'id'=(select x->>'id' from jsonb_array_elements(first_list) x where x->>'source'='champions' and x->>'source_key'='1792774800000' and x->>'slot'='1')) then raise exception 'Original slot replaced'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002782","role":"authenticated","is_anonymous":false}',true);
 begin perform public.footera_list_player_picks('picks-278');
 exception when sqlstate '42501' then denied:=true; end;
 if not denied then raise exception 'Another account accessed the picks'; end if;
end $$;
reset role;
rollback;
