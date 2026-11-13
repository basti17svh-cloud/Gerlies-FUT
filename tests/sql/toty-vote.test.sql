-- Isolated test fixture only; no real account data. The clock is the setting test.now inside rewritten function copies.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-00000000b001','toty-a@example.invalid',now()),
 ('00000000-0000-4000-8000-00000000b002','toty-b@example.invalid',now());
do $$declare d text;begin
 select pg_get_functiondef('public.footera_toty_vote(smallint,text[])'::regprocedure) into d;
 execute replace(d,'now()','current_setting(''test.now'')::timestamptz');
end$$;
-- 1 TW, 4 ABW, 3 MF, 3 ST from the nominees (season 2026).
create temp table ballot as select (
 (select array_agg(pid) from (select pid from public.footera_toty_nominees where season=2026 and slot='gk' order by pid limit 1) a)||
 (select array_agg(pid) from (select pid from public.footera_toty_nominees where season=2026 and slot='def' order by pid limit 4) b)||
 (select array_agg(pid) from (select pid from public.footera_toty_nominees where season=2026 and slot='mid' order by pid limit 3) c)||
 (select array_agg(pid) from (select pid from public.footera_toty_nominees where season=2026 and slot='att' order by pid limit 3) d)) as picks;
grant select on ballot to authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000b001","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;p text[];bad boolean;ok boolean;begin
 select picks into p from ballot;
 bad:=false;begin perform * from public.footera_toty_votes;exception when insufficient_privilege then bad:=true;end;
 if not bad then raise exception 'ballots must not be readable'; end if;
 -- Before the vote opens.
 perform set_config('test.now','2026-12-11T17:59:00Z',true);
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,p);exception when others then bad:=true;end;
 if not bad then raise exception 'vote before 11.12. 19:00 accepted'; end if;
 perform set_config('test.now','2026-12-11T18:00:00Z',true);
 -- Wrong shapes.
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,p[1:10]);exception when others then bad:=true;end;
 if not bad then raise exception '10 players accepted'; end if;
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,array_append(p[1:10],p[1]));exception when others then bad:=true;end;
 if not bad then raise exception 'duplicate player accepted'; end if;
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,array_append(p[1:10],'999999'));exception when others then bad:=true;end;
 if not bad then raise exception 'non-nominee accepted'; end if;
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,array[p[1],p[2],p[3],p[4],p[5],p[6],p[7],p[8],p[9],p[10],p[2]]);exception when others then bad:=true;end;
 if not bad then raise exception 'wrong formation accepted'; end if;
 -- First ballot counts, a second one does not.
 r:=public.footera_toty_vote(2026::smallint,p);
 if not (r->>'accepted')::boolean then raise exception 'first ballot rejected %',r; end if;
 r:=public.footera_toty_vote(2026::smallint,p);
 if (r->>'accepted')::boolean or not (r->>'already')::boolean then raise exception 'second ballot counted %',r; end if;
 -- Thank-you pack exactly once.
 ok:=public.footera_toty_claim_reward(2026::smallint);if not ok then raise exception 'first claim false'; end if;
 ok:=public.footera_toty_claim_reward(2026::smallint);if ok then raise exception 'second claim true'; end if;
 if (select count(*) from public.footera_toty_my_vote(2026::smallint))<>1 then raise exception 'my vote missing'; end if;
 -- After the vote closes.
 perform set_config('test.now','2027-01-03T18:00:00Z',true);
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000b002","role":"authenticated"}',true);
set local role authenticated;
do $$declare p text[];bad boolean;begin
 select picks into p from ballot;
 perform set_config('test.now','2027-01-03T18:00:00Z',true);
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,p);exception when others then bad:=true;end;
 if not bad then raise exception 'vote after 03.01. 19:00 accepted'; end if;
 if public.footera_toty_claim_reward(2026::smallint) then raise exception 'claim without ballot'; end if;
end$$;
reset role;
set local role anon;
do $$declare n bigint;t bigint;bad boolean;begin
 select count(*),sum(votes) into n,t from public.footera_toty_results(2026::smallint);
 if n<>37 then raise exception 'expected 37 nominees, got %',n; end if;
 if t<>11 then raise exception 'expected 11 votes, got %',t; end if;
 bad:=false;begin perform public.footera_toty_vote(2026::smallint,'{}');exception when insufficient_privilege then bad:=true;end;
 if not bad then raise exception 'anon may vote'; end if;
end$$;
reset role;
rollback;
\echo 'TOTY vote SQL tests passed'
