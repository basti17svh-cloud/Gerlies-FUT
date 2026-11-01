-- Isolated test fixture only; no real account data. The clock is the setting test.now inside rewritten function copies.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-00000000a001','league-a@example.invalid',now()),
 ('00000000-0000-4000-8000-00000000a002','league-b@example.invalid',now()),
 ('00000000-0000-4000-8000-00000000a003','league-c@example.invalid',now());

-- Week boundaries: Sunday 19:00 Berlin, both sides of the October clock change.
do $$begin
 if public.footera_rivals_league_week('2026-11-01T17:59:59Z')<>'2026-10-25T18:00:00Z' then raise exception 'week before Sunday 19:00 wrong'; end if;
 if public.footera_rivals_league_week('2026-11-01T18:00:00Z')<>'2026-11-01T18:00:00Z' then raise exception 'week at Sunday 19:00 wrong'; end if;
 if public.footera_rivals_league_week('2026-10-25T17:30:00Z')<>'2026-10-18T17:00:00Z' then raise exception 'DST week wrong'; end if;
 if public.footera_rivals_league_week('2027-03-28T17:00:00Z')<>'2027-03-28T17:00:00Z' then raise exception 'summer time week wrong'; end if;
end$$;

-- Pin the clock to Wednesday 04.11.2026 12:00 UTC for report/board.
-- The test clock is the setting test.now (read inside the rewritten functions).
do $$declare d text;fn regprocedure;begin
 foreach fn in array array['public.footera_rivals_league_report(bigint,text,integer,integer,integer,integer,integer)'::regprocedure,'public.footera_rivals_league_board(bigint,uuid[])'::regprocedure] loop
  select pg_get_functiondef(fn) into d;execute replace(d,'now()','current_setting(''test.now'')::timestamptz');
 end loop;
end$$;
select set_config('test.now','2026-11-04T12:00:00Z',false);

-- 1793556000000 = 01.11.2026 19:00 Berlin (current week); 1792951200000 = 25.10. (closed).
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}',true);
set local role authenticated;
do $$declare r jsonb;bad boolean;n int;begin
 bad:=false;begin perform * from public.footera_rivals_league;exception when insufficient_privilege then bad:=true;end;
 if not bad then raise exception 'table readable directly'; end if;
 r:=public.footera_rivals_league_report(1793556000000,'  FC Alpha  ',3,1,1,9,4);
 if r->>'points'<>'10' or r->>'matches'<>'5' then raise exception 'report wrong: %',r; end if;
 -- An older device with fewer games never lowers the standing.
 r:=public.footera_rivals_league_report(1793556000000,'FC Alpha',1,0,0,2,0);
 if r->>'points'<>'10' then raise exception 'standing lowered: %',r; end if;
 bad:=false;begin perform public.footera_rivals_league_report(1792951200000,'FC Alpha',1,0,0,1,0);exception when sqlstate '22023' then bad:=true;end;
 if not bad then raise exception 'closed week accepted'; end if;
 bad:=false;begin perform public.footera_rivals_league_report(1793556000001,'FC Alpha',1,0,0,1,0);exception when sqlstate '22023' then bad:=true;end;
 if not bad then raise exception 'odd week key accepted'; end if;
 bad:=false;begin perform public.footera_rivals_league_report(1793556000000,'FC Alpha',1,0,0,99,0);exception when sqlstate '22023' then bad:=true;end;
 if not bad then raise exception 'implausible goals accepted'; end if;
 bad:=false;begin perform public.footera_rivals_league_report(1793556000000,'FC Alpha',-1,0,0,0,0);exception when sqlstate '22023' then bad:=true;end;
 if not bad then raise exception 'negative wins accepted'; end if;
end$$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000a002","role":"authenticated"}',true);
do $$begin perform public.footera_rivals_league_report(1793556000000,'FC Beta',4,0,0,8,2);end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000a003","role":"authenticated"}',true);
do $$begin perform public.footera_rivals_league_report(1793556000000,'FC Fremd',9,0,0,20,0);end$$;

-- A sees only itself and the friends it asks for; the open week is not closed.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000a001","role":"authenticated"}',true);
do $$declare n int;me int;c int;closed_any boolean;begin
 select count(*),count(*) filter(where is_me),count(*) filter(where club_name='FC Alpha'),bool_or(closed) into n,me,c,closed_any
 from public.footera_rivals_league_board(1793556000000,array['00000000-0000-4000-8000-00000000a002']::uuid[]);
 if n<>2 or me<>1 or c<>1 then raise exception 'board rows wrong: % % %',n,me,c; end if;
 if closed_any then raise exception 'open week reported as closed'; end if;
end$$;
reset role;

-- After Sunday 19:10 the same week is closed and frozen.
select set_config('test.now','2026-11-08T18:05:00Z',false);
set local role authenticated;
do $$declare closed_all boolean;begin
 -- Grace: late report for the just-finished week still lands at 19:05.
 perform public.footera_rivals_league_report(1793556000000,'FC Alpha',4,1,1,11,5);
 if exists(select 1 from public.footera_rivals_league_board(1793556000000,'{}') where closed) then raise exception 'closed during grace'; end if;
 perform set_config('test.now','2026-11-08T18:11:00Z',false);
 select bool_and(closed) into closed_all from public.footera_rivals_league_board(1793556000000,array['00000000-0000-4000-8000-00000000a002']::uuid[]);
 if not closed_all then raise exception 'finished week not closed'; end if;
 if (select points from public.footera_rivals_league_board(1793556000000,'{}') where is_me)<>13 then raise exception 'grace report missing'; end if;
end$$;
reset role;
set local role authenticated;
do $$declare bad boolean:=false;begin
 begin perform public.footera_rivals_league_report(1793556000000,'FC Alpha',9,1,1,20,5);exception when sqlstate '22023' then bad:=true;end;
 if not bad then raise exception 'report after grace accepted'; end if;
end$$;
reset role;

-- Anonymous callers without a session are rejected.
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
do $$declare bad boolean:=false;begin
 begin perform public.footera_rivals_league_board(1793556000000,'{}');exception when sqlstate '42501' then bad:=true;end;
 if not bad then raise exception 'board without login'; end if;
end$$;
reset role;
rollback;
select 'rivals league sql ok';
