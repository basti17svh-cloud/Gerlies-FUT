-- Footera V21.414: Team of the Year 2026, fan vote (Basti 2026-11-13).
-- One ballot per account between Fr 11.12.2026 19:00 and So 03.01.2027 19:00 Berlin:
-- 1 goalkeeper, 4 defenders, 3 midfielders, 3 attackers, all from the fixed nominee list.
-- The ballot table is never exposed; everyone reads only the per-player totals.
-- The thank-you pack is claimed once per account through footera_toty_claim_reward (never twice).
begin;

create table if not exists public.footera_toty_nominees(
 season smallint not null,
 pid text not null,
 slot text not null check(slot in ('gk','def','mid','att')),
 primary key(season,pid)
);
alter table public.footera_toty_nominees enable row level security;
revoke all on public.footera_toty_nominees from public,anon,authenticated;
insert into public.footera_toty_nominees(season,pid,slot) values
 (2026,'192119','gk'),
 (2026,'230621','gk'),
 (2026,'200389','gk'),
 (2026,'220901','gk'),
 (2026,'212831','gk'),
 (2026,'232580','def'),
 (2026,'252145','def'),
 (2026,'256196','def'),
 (2026,'203376','def'),
 (2026,'235212','def'),
 (2026,'243715','def'),
 (2026,'207865','def'),
 (2026,'213331','def'),
 (2026,'229558','def'),
 (2026,'239818','def'),
 (2026,'247819','def'),
 (2026,'226268','def'),
 (2026,'231866','mid'),
 (2026,'247827','mid'),
 (2026,'251854','mid'),
 (2026,'252371','mid'),
 (2026,'255253','mid'),
 (2026,'158023','mid'),
 (2026,'212198','mid'),
 (2026,'212622','mid'),
 (2026,'234378','mid'),
 (2026,'241084','mid'),
 (2026,'231747','att'),
 (2026,'239085','att'),
 (2026,'202126','att'),
 (2026,'231443','att'),
 (2026,'277643','att'),
 (2026,'238794','att'),
 (2026,'247635','att'),
 (2026,'233419','att'),
 (2026,'231478','att'),
 (2026,'246669','att')
on conflict(season,pid) do update set slot=excluded.slot;

create table if not exists public.footera_toty_votes(
 season smallint not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 picks text[] not null check(cardinality(picks)=11),
 reward_claimed boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(season,user_id)
);
alter table public.footera_toty_votes enable row level security;
revoke all on public.footera_toty_votes from public,anon,authenticated;

create or replace function public.footera_toty_vote(p_season smallint,p_picks text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); picks text[]; n_gk int; n_def int; n_mid int; n_att int; n_known int; inserted int;
begin
 if u is null then raise exception 'Nicht angemeldet' using errcode='42501'; end if;
 if p_season is distinct from 2026 then raise exception 'Unbekannte Abstimmung.' using errcode='22023'; end if;
 if now()<timestamptz '2026-12-11 19:00:00 Europe/Berlin' or now()>=timestamptz '2027-01-03 19:00:00 Europe/Berlin' then
  raise exception 'Die TOTY-Abstimmung ist gerade nicht offen.' using errcode='22023'; end if;
 select array_agg(distinct x) into picks from unnest(coalesce(p_picks,'{}'::text[])) x;
 if cardinality(coalesce(picks,'{}'))<>11 or cardinality(p_picks)<>11 then raise exception 'Genau 11 verschiedene Spieler wählen.' using errcode='22023'; end if;
 select count(*) filter(where slot='gk'),count(*) filter(where slot='def'),count(*) filter(where slot='mid'),count(*) filter(where slot='att'),count(*)
  into n_gk,n_def,n_mid,n_att,n_known from public.footera_toty_nominees where season=p_season and pid=any(picks);
 if n_known<>11 or n_gk<>1 or n_def<>4 or n_mid<>3 or n_att<>3 then
  raise exception 'Ungültige Aufstellung (1 TW, 4 ABW, 3 MF, 3 ST aus den Nominierten).' using errcode='22023'; end if;
 insert into public.footera_toty_votes(season,user_id,picks) values(p_season,u,picks) on conflict do nothing;
 get diagnostics inserted=row_count;
 return jsonb_build_object('accepted',inserted=1,'already',inserted=0);
end $$;
revoke all on function public.footera_toty_vote(smallint,text[]) from public,anon;
grant execute on function public.footera_toty_vote(smallint,text[]) to authenticated;

-- Returns true exactly once per ballot: the client grants the thank-you pack only then.
create or replace function public.footera_toty_claim_reward(p_season smallint)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); changed int;
begin
 if u is null then raise exception 'Nicht angemeldet' using errcode='42501'; end if;
 update public.footera_toty_votes set reward_claimed=true where season=p_season and user_id=u and not reward_claimed;
 get diagnostics changed=row_count;
 return changed=1;
end $$;
revoke all on function public.footera_toty_claim_reward(smallint) from public,anon;
grant execute on function public.footera_toty_claim_reward(smallint) to authenticated;

create or replace function public.footera_toty_my_vote(p_season smallint)
returns table(picks text[],reward_claimed boolean) language sql stable security definer set search_path='' as $$
 select v.picks,v.reward_claimed from public.footera_toty_votes v where v.season=p_season and v.user_id=auth.uid()
$$;
revoke all on function public.footera_toty_my_vote(smallint) from public,anon;
grant execute on function public.footera_toty_my_vote(smallint) to authenticated;

-- Totals per nominee (no user data). Readable by guests too.
create or replace function public.footera_toty_results(p_season smallint)
returns table(pid text,slot text,votes bigint) language sql stable security definer set search_path='' as $$
 select n.pid,n.slot,count(v.user_id) from public.footera_toty_nominees n
 left join public.footera_toty_votes v on v.season=n.season and n.pid=any(v.picks)
 where n.season=p_season group by n.pid,n.slot
$$;
revoke all on function public.footera_toty_results(smallint) from public;
grant execute on function public.footera_toty_results(smallint) to anon,authenticated;

commit;
