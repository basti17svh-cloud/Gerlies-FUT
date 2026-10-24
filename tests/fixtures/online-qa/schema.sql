create role authenticated nologin; create role anon nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(current_setting('request.jwt.claim.sub',true),(current_setting('request.jwt.claims',true)::jsonb->>'sub')),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
create table public.footera_online_profiles(user_id uuid primary key references auth.users(id) on delete cascade,username text not null,club_name text not null,rating int not null,chem int not null,formation text not null,squad jsonb not null,squads jsonb not null default '[]',active_preset int not null default 0,updated_at timestamptz not null default now(),friend_code text not null,club_short_name text not null default 'FTR',club_identity jsonb not null default '{}',last_seen_at timestamptz,
 check (jsonb_typeof(squad)='array' and jsonb_array_length(squad)=18 and pg_column_size(squad)<32768), check (pg_column_size(squads)<98304));
create table public.footera_duels(id uuid default gen_random_uuid() primary key,home_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,away_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 home_profile jsonb not null,away_profile jsonb,home_lineup jsonb not null,away_lineup jsonb,status text default 'invited' not null check (status in ('invited','live','halftime','finished','declined','abandoned')),minute smallint default 0 not null check(minute between 0 and 90),
 home_score smallint default 0 not null,away_score smallint default 0 not null,home_tactic text default 'balanced' not null,away_tactic text default 'balanced' not null,home_subs smallint default 0 not null check(home_subs between 0 and 5),away_subs smallint default 0 not null check(away_subs between 0 and 5),
 home_used_bench jsonb default '[]' not null,away_used_bench jsonb default '[]' not null,home_ready boolean default false not null,away_ready boolean default false not null,events jsonb default '[]' not null,clock_at timestamptz default now() not null,created_at timestamptz default now() not null,finished_at timestamptz,
 home_shots smallint default 0 not null,away_shots smallint default 0 not null,home_xg numeric default 0 not null,away_xg numeric default 0 not null,home_possession numeric default 50 not null, check(home_user<>away_user));
alter table public.footera_duels enable row level security;
create policy footera_duels_participants on public.footera_duels for select using (((select auth.uid())=home_user) or ((select auth.uid())=away_user));
grant select on public.footera_duels to authenticated;
