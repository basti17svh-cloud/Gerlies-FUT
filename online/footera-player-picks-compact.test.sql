-- Isolated large-save integration regression. Every fixture/claim rolls back.
begin;
set local statement_timeout='5s';
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000002801','compact-pick@example.invalid',now()),
 ('00000000-0000-4000-8000-000000002802','compact-other@example.invalid',now());
-- Use the real club-size shape without modifying the source account or its picks.
insert into public.footera_cloud_saves(user_id,save_data,revision)
select '00000000-0000-4000-8000-000000002801',jsonb_set(save_data,'{profile,saveId}','"compact-load-test"'),1
from public.footera_cloud_saves where user_id='d3f59db0-1b9f-4890-bf76-2f6d929ca902';
insert into public.footera_player_picks(id,user_id,save_id,source,source_key,slot,type,choices,min_rating,options,opened_at)
select ids.id,'00000000-0000-4000-8000-000000002801','compact-load-test','admin-test','compact-regression',ids.slot,'champions-red',4,85,p.options,now()
from public.footera_player_picks p cross join (values ('00000000-0000-4000-8000-000000002803'::uuid,1),('00000000-0000-4000-8000-000000002804'::uuid,2)) ids(id,slot)
where p.id='6d70f128-74a5-4177-8654-24bf06afc776';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002801","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
do $$
declare r jsonb; q jsonb; s jsonb; selected text; wallet text; start_time timestamptz; elapsed numeric; refused boolean;
begin
 select save_data into s from public.footera_cloud_saves where user_id=auth.uid();
 if octet_length(s::text)<2000000 then raise exception 'Large club fixture missing';end if;
 wallet:=s->>'coins';
 select options->0->>'id' into selected from public.footera_player_picks where id='00000000-0000-4000-8000-000000002803';
 start_time:=clock_timestamp();
 r:=public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002803',selected,'compact-load-test',1);
 elapsed:=extract(epoch from clock_timestamp()-start_time)*1000;
 if r ? 'save_data' or octet_length(r::text)>16000 then raise exception 'Receipt includes full save or too much data';end if;
 if r->>'revision'<>'2' or r->>'replayed'<>'false' then raise exception 'Wrong initial claim';end if;
 select save_data into s from public.footera_cloud_saves where user_id=auth.uid();
 if s->>'coins' is distinct from wallet then raise exception 'Pick changed wallet';end if;
 if (select count(*) from jsonb_array_elements(coalesce(s->'club','[]')||coalesce(s->'sbcStorage','[]')) x where x->>'uid'='00000000-0000-4000-8000-000000002803')<>1 then raise exception 'Item not delivered exactly once';end if;
 q:=public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002803',selected,'compact-load-test',1);
 if q->>'replayed'<>'true' or q->'item'<>r->'item' then raise exception 'Retry changed selection';end if;
 -- A subsequent legitimate save must not break recovery of a lost response.
 perform public.footera_store_cloud_save(jsonb_set(s,'{coins}',to_jsonb((s->>'coins')::bigint+1)),2);
 q:=public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002803',selected,'compact-load-test',1);
 if q->>'revision'<>'2' or q->>'cloud_revision'<>'3' then raise exception 'Advanced-cloud receipt wrong';end if;
 refused:=false;
 begin perform public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002803','different-choice','compact-load-test',1);
 exception when sqlstate '22023' then refused:=true;end;
 if not refused then raise exception 'Changed selection accepted';end if;
 refused:=false;
 begin perform public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002804',selected,'compact-load-test',1);
 exception when sqlstate '40001' then refused:=true;end;
 if not refused then raise exception 'Stale revision accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002802","role":"authenticated","is_anonymous":false}',true);
 refused:=false;
 begin perform public.footera_choose_player_pick_compact('00000000-0000-4000-8000-000000002803',selected,'compact-load-test',1);
 exception when sqlstate '42501' then refused:=true;end;
 if not refused then raise exception 'Other account accepted';end if;
 raise notice 'Compact large-save claim: % ms, receipt % bytes',round(elapsed),octet_length(r::text);
end $$;
reset role;
rollback;
select 'Compact large-save claim, retries, newer cloud, stale revision and ownership: PASS' as result;
