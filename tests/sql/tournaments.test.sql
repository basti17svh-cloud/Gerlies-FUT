-- Isolated test fixture only; no real account data.
begin;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-4000-8000-000000003111','cup@example.invalid',now()),('00000000-0000-4000-8000-000000003112','other@example.invalid',now());
do $$declare d text;begin
 select pg_get_functiondef('footera_private.claim_tournament_reward(text,text,text,bigint)'::regprocedure) into d;
 execute replace(d,'now()',quote_literal('2026-11-06T20:00:00+01:00')||'::timestamptz');
end$$;
insert into public.footera_pick_catalog(id,kind,rating,starts_at,ends_at,item)
select 'cup-test-'||i,'standard',84+i,'2026-01-01','2027-01-01',jsonb_build_object('pid','cup-player-'||i,'displayRating',84+i,'tradeable',false,'baseSnapshot',jsonb_build_object('id','cup-player-'||i,'name','QA '||i,'ovr',84+i,'position','ST')) from generate_series(1,4) i;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000003111","is_anonymous":false,"role":"authenticated"}',true);
set local role authenticated;
do $$declare s jsonb;wins jsonb;roster jsonb;rev bigint;r jsonb;retry jsonb;cup text;rating int;v jsonb;bad boolean;p jsonb;old jsonb;
begin
 s:='{"version":128,"profile":{"saveId":"tournament-fixture"},"club":[],"squad":[],"coins":100,"points":0,"packs":{},"rewardPackQueue":[]}';
 rev:=public.footera_store_cloud_save(s,0);
 bad:=false;begin perform public.footera_claim_tournament_reward('tournament-fixture','bronze','2026-10-29',rev);exception when sqlstate '22023' then bad:=true;end;if not bad then raise exception 'unearned reward accepted';end if;
 foreach cup in array array['bronze','silver','open'] loop
  rating:=case cup when 'bronze' then 60 when 'silver' then 70 else 85 end;
  select jsonb_agg(jsonb_build_object('uid','qa-'||i,'rating',rating)) into roster from generate_series(1,18) i;
  select jsonb_agg(jsonb_build_object('id',cup||'-win-'||i,'stage',i,'kickoffAt',1793383200000+i*10000,'finishedAt',1793383201000+i*10000,'roster',roster)) into wins from generate_series(1,3) i;
  s:=jsonb_set(s,'{tournaments}',coalesce(s->'tournaments','{}')||jsonb_build_object(cup,jsonb_build_object('2026-10-29',jsonb_build_object('earned',wins))));
  rev:=public.footera_store_cloud_save(s,rev);
  bad:=false;begin perform public.footera_claim_tournament_reward('tournament-fixture',cup,'2026-10-29',rev-1);exception when sqlstate 'PT409' then bad:=true;end;if not bad then raise exception 'stale revision accepted';end if;
  old:=s;r:=public.footera_claim_tournament_reward('tournament-fixture',cup,'2026-10-29',rev);
  retry:=public.footera_claim_tournament_reward('tournament-fixture',cup,'2026-10-29',rev);
  if retry->>'replayed'<>'true' or retry->>'revision'<>r->>'revision' then raise exception 'receipt not idempotent';end if;
  rev:=(r->>'revision')::bigint;select save_data into s from public.footera_cloud_saves;
  if (s->>'coins')::int<>(old->>'coins')::int+(case cup when 'bronze' then 7500 when 'silver' then 15000 else 20000 end) then raise exception 'wrong coins';end if;
  if cup='bronze' and (s#>>'{packs,goldplayers}'<>'2' or jsonb_array_length(s->'rewardPackQueue')<>2) then raise exception 'wrong bronze packs';end if;
  if cup='silver' and (s#>>'{packs,83x3-sbc}'<>'2' or jsonb_array_length(s->'rewardPackQueue')<>4) then raise exception 'wrong silver packs';end if;
  if cup='open' then
   if jsonb_array_length(r->'pick_ids')<>2 then raise exception 'two picks missing';end if;
   p:=public.footera_open_player_pick((r#>>'{pick_ids,0}')::uuid,'tournament-fixture');
   if p->>'choices'<>'3' or p->>'min_rating'<>'84' or jsonb_array_length(p->'options')<>3 then raise exception 'wrong pick rules';end if;
   if public.footera_open_player_pick((r#>>'{pick_ids,0}')::uuid,'tournament-fixture')->'options'<>p->'options' then raise exception 'pick rerolled';end if;
   perform public.footera_choose_player_pick_compact((p->>'id')::uuid,p#>>'{options,0,id}','tournament-fixture',rev);
   select revision,save_data into rev,s from public.footera_cloud_saves;
   if jsonb_array_length(s->'club')<>1 then raise exception 'pick not delivered';end if;
  end if;
 end loop;
 -- A new Thursday permits a new weekly prize without erasing the previous receipt.
 select jsonb_agg(jsonb_build_object('uid','next-'||i,'rating',60)) into roster from generate_series(1,18) i;
 select jsonb_agg(jsonb_build_object('id','next-win-'||i,'stage',i,'kickoffAt',1793988000000+i*10000,'finishedAt',1793988001000+i*10000,'roster',roster)) into wins from generate_series(1,3) i;
 s:=jsonb_set(s,'{tournaments,bronze}',(s#>'{tournaments,bronze}')||jsonb_build_object('2026-11-05',jsonb_build_object('earned',wins)));
 rev:=public.footera_store_cloud_save(s,rev);old:=s;
 r:=public.footera_claim_tournament_reward('tournament-fixture','bronze','2026-11-05',rev);rev:=(r->>'revision')::bigint;
 select save_data into s from public.footera_cloud_saves;
 if s#>>'{packs,goldplayers}'<>'4' or (s->>'coins')::int<>(old->>'coins')::int+7500 then raise exception 'next week prize missing';end if;
 bad:=false;begin perform public.footera_store_cloud_save(s-'challengeClaims',rev);exception when sqlstate 'PT409' then bad:=true;end;if not bad then raise exception 'receipt rollback accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000003112","is_anonymous":false,"role":"authenticated"}',true);
 bad:=false;begin perform public.footera_claim_tournament_reward('tournament-fixture','bronze','2026-10-29',rev);exception when sqlstate '42501' then bad:=true;end;if not bad then raise exception 'foreign club accepted';end if;
end$$;
reset role;
do $$declare s jsonb;t jsonb;begin
 select save_data into s from public.footera_cloud_saves where user_id='00000000-0000-4000-8000-000000003111';
 if not footera_private.tournament_earned(s,'bronze','2026-10-29','2026-11-06T20:00:00+01:00') then raise exception 'late claim rejected';end if;
 if footera_private.tournament_earned(s,'bronze','2026-10-29','2026-10-29T18:59:00+01:00') then raise exception 'future matches accepted';end if;
 t:=jsonb_set(s,'{tournaments,bronze,2026-10-29,earned,1,id}','"bronze-win-1"');
 if footera_private.tournament_earned(t,'bronze','2026-10-29','2026-11-06') then raise exception 'duplicate win accepted';end if;
 t:=jsonb_set(s,'{tournaments,bronze,2026-10-29,earned,0,roster,17,rating}','75');
 if footera_private.tournament_earned(t,'bronze','2026-10-29','2026-11-06') then raise exception 'gold bench in bronze cup';end if;
 if has_function_privilege('anon','public.footera_claim_tournament_reward(text,text,text,bigint)','execute') or has_table_privilege('authenticated','footera_private.tournament_receipts','insert') then raise exception 'public receipt minting';end if;
end$$;
rollback;
