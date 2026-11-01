-- Footera V21.329: Wochen-Rivals Freundesliga.
-- Each player reports their own Rivals results for the current league week
-- (Sunday 19:00 to Sunday 19:00, Europe/Berlin). Friends read each other's
-- weekly standing through a checked RPC; the table itself is never exposed.
-- Rewards stay in the game's weekly reward rows (like Rivals/Squad Battles);
-- the server only freezes the standings after the week plus a short grace.
begin;

create table if not exists public.footera_rivals_league(
 user_id uuid not null references auth.users(id) on delete cascade,
 week_start timestamptz not null,
 club_name text not null check(char_length(club_name) between 1 and 30),
 points integer not null check(points between 0 and 1200),
 wins integer not null check(wins between 0 and 400),
 draws integer not null check(draws between 0 and 400),
 losses integer not null check(losses between 0 and 400),
 goals_for integer not null check(goals_for between 0 and 4000),
 goals_against integer not null check(goals_against between 0 and 4000),
 updated_at timestamptz not null default now(),
 primary key(user_id,week_start),
 check(points=3*wins+draws),
 check(wins+draws+losses<=400)
);
create index if not exists footera_rivals_league_week_idx on public.footera_rivals_league(week_start);
alter table public.footera_rivals_league enable row level security;
revoke all on public.footera_rivals_league from public,anon,authenticated;

-- Start of the league week containing p_at: the latest Sunday 19:00 Berlin wall time.
create or replace function public.footera_rivals_league_week(p_at timestamptz)
returns timestamptz language plpgsql stable set search_path='' as $$
declare l timestamp:=p_at at time zone 'Europe/Berlin'; s timestamp;
begin
 s:=(l::date-extract(dow from l)::int)+time '19:00';
 if s>l then s:=s-interval '7 days'; end if;
 return s at time zone 'Europe/Berlin';
end $$;
revoke all on function public.footera_rivals_league_week(timestamptz) from public,anon;
grant execute on function public.footera_rivals_league_week(timestamptz) to authenticated;

create or replace function public.footera_rivals_league_report(
 p_week bigint,p_club text,p_wins integer,p_draws integer,p_losses integer,p_goals_for integer,p_goals_against integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); cur timestamptz:=public.footera_rivals_league_week(now()); prev timestamptz; w timestamptz; club text; r public.footera_rivals_league%rowtype;
begin
 if u is null then raise exception 'Nicht angemeldet' using errcode='42501'; end if;
 if p_week is null or p_wins is null or p_draws is null or p_losses is null or p_goals_for is null or p_goals_against is null then
  raise exception 'Unvollständige Ligadaten.' using errcode='22023'; end if;
 w:=to_timestamp(p_week/1000.0);
 prev:=public.footera_rivals_league_week(cur-interval '1 second');
 -- Late reports for the week that just ended are accepted for ten minutes (network retries).
 if not (w=cur or (w=prev and now()<cur+interval '10 minutes')) then
  raise exception 'Diese Ligawoche ist bereits abgeschlossen.' using errcode='22023'; end if;
 if least(p_wins,p_draws,p_losses,p_goals_for,p_goals_against)<0 or p_wins+p_draws+p_losses>400
  or p_goals_for>10*(p_wins+p_draws+p_losses) or p_goals_against>10*(p_wins+p_draws+p_losses) then
  raise exception 'Unplausible Ligadaten.' using errcode='22023'; end if;
 club:=left(btrim(regexp_replace(coalesce(p_club,''),'[[:cntrl:]]','','g')),30);
 if char_length(club)<1 then club:='Footera Club'; end if;
 insert into public.footera_rivals_league as t(user_id,week_start,club_name,points,wins,draws,losses,goals_for,goals_against,updated_at)
 values(u,w,club,3*p_wins+p_draws,p_wins,p_draws,p_losses,p_goals_for,p_goals_against,now())
 on conflict(user_id,week_start) do update
  set club_name=excluded.club_name,points=excluded.points,wins=excluded.wins,draws=excluded.draws,losses=excluded.losses,
      goals_for=excluded.goals_for,goals_against=excluded.goals_against,updated_at=now()
  -- An older device or save never lowers a standing that already has more games.
  where excluded.wins+excluded.draws+excluded.losses>=t.wins+t.draws+t.losses;
 select * into r from public.footera_rivals_league where user_id=u and week_start=w;
 return jsonb_build_object('week',p_week,'matches',r.wins+r.draws+r.losses,'points',r.points);
end $$;
revoke all on function public.footera_rivals_league_report(bigint,text,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.footera_rivals_league_report(bigint,text,integer,integer,integer,integer,integer) to authenticated;

create or replace function public.footera_rivals_league_board(p_week bigint,p_friends uuid[])
returns table(user_id uuid,club_name text,points integer,wins integer,draws integer,losses integer,goals_for integer,goals_against integer,is_me boolean,closed boolean)
language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); w timestamptz; ends timestamptz;
begin
 if u is null then raise exception 'Nicht angemeldet' using errcode='42501'; end if;
 if p_week is null then raise exception 'Ligawoche fehlt.' using errcode='22023'; end if;
 if cardinality(coalesce(p_friends,'{}'))>200 then raise exception 'Zu viele Freunde' using errcode='22023'; end if;
 w:=to_timestamp(p_week/1000.0);
 ends:=((w at time zone 'Europe/Berlin')+interval '7 days') at time zone 'Europe/Berlin';
 return query
 select t.user_id,t.club_name,t.points,t.wins,t.draws,t.losses,t.goals_for,t.goals_against,t.user_id=u,
  now()>=ends+interval '10 minutes'
 from public.footera_rivals_league t
 where t.week_start=w and (t.user_id=u or t.user_id=any(coalesce(p_friends,'{}')));
end $$;
revoke all on function public.footera_rivals_league_board(bigint,uuid[]) from public,anon;
grant execute on function public.footera_rivals_league_board(bigint,uuid[]) to authenticated;

notify pgrst,'reload schema';
commit;
