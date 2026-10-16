-- Isolated real-database integration test; all fixtures and choices roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000001161','pick-test@example.invalid',now()),
 ('00000000-0000-4000-8000-000000001162','pick-other@example.invalid',now());
insert into public.footera_cloud_saves(user_id,save_data,revision) values
 ('00000000-0000-4000-8000-000000001161','{"version":128,"coins":0,"points":0,"profile":{"saveId":"pick-test"},"club":[],"squad":[],"weeklyRewards":[{"mode":"champions","week":"1792170000000","wins":15,"claimed":true,"reward":{"playerPicks":[{"choices":99,"minRating":99}]}}]}',1);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001161","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$
declare p jsonb; q jsonb; chosen jsonb; rejected boolean; input jsonb:='{"version":128,"coins":0,"points":0,"profile":{"saveId":"pick-test"},"club":[],"squad":[],"weeklyRewards":[]}';
begin
 q:=public.footera_list_player_picks('pick-test');
 if jsonb_array_length(q)<>3 then raise exception 'rank I must issue exactly three picks'; end if;
 if public.footera_list_player_picks('pick-test')<>q then raise exception 'duplicate weekly issuance'; end if;
 p:=q->0;
 p:=public.footera_open_player_pick((p->>'id')::uuid,'pick-test');
 if jsonb_array_length(p->'options')<>4 or (p->>'min_rating')::int<>85 then raise exception 'server rules not applied'; end if;
 if exists(select 1 from jsonb_array_elements(p->'options') x where (x#>>'{item,displayRating}')::int<85) then raise exception 'under85 offered'; end if;
 q:=public.footera_open_player_pick((p->>'id')::uuid,'pick-test');
 if p<>q then raise exception 'options changed on retry'; end if;
 rejected:=false;
 begin perform public.footera_choose_player_pick((p->>'id')::uuid,'invalid',input,1);
 exception when sqlstate '22023' then rejected:=true; end;
 if not rejected then raise exception 'unoffered card accepted'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001162","role":"authenticated","is_anonymous":false}',true);
 if exists(select 1 from public.footera_player_picks where id=(p->>'id')::uuid) then raise exception 'RLS leaks other owner'; end if;
 rejected:=false;
 begin perform public.footera_open_player_pick((p->>'id')::uuid,'pick-test');
 exception when sqlstate '42501' then rejected:=true; end;
 if not rejected then raise exception 'other owner allowed'; end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001161","role":"authenticated","is_anonymous":false}',true);
 chosen:=public.footera_choose_player_pick((p->>'id')::uuid,p#>>'{options,0,id}',input,1);
 if jsonb_array_length(chosen#>'{save_data,club}')<>1 or chosen#>>'{item,cosmeticDesign}'<>'red' or chosen#>>'{item,tradeable}'<>'false' then raise exception 'delivery wrong'; end if;
 q:=public.footera_choose_player_pick((p->>'id')::uuid,p#>>'{options,0,id}',input,1);
 if q<>chosen then raise exception 'retry duplicated'; end if;
 if jsonb_array_length(public.footera_list_player_picks('pick-test'))<>2 then raise exception 'claimed pick listed'; end if;
 -- An already owned matching card goes to SBC storage, and the original is retained.
 q:=public.footera_list_player_picks('pick-test')->0;q:=public.footera_open_player_pick((q->>'id')::uuid,'pick-test');
 input:=chosen->'save_data';
 input:=jsonb_set(input,'{club}',jsonb_build_array((q#>'{options,0,item}')||'{"uid":"existing"}'::jsonb));
 chosen:=public.footera_choose_player_pick((q->>'id')::uuid,q#>>'{options,0,id}',input,2);
 if jsonb_array_length(chosen#>'{save_data,sbcStorage}')<>1 or chosen#>>'{save_data,club,0,uid}'<>'existing' then raise exception 'duplicate routing wrong'; end if;
end $$;
reset role;
rollback;
