-- Footera live friendlies. Run once in the Supabase SQL editor.
-- The public browser key never grants writes to a duel; all transitions use checked RPCs.
create extension if not exists pgcrypto;

create table if not exists public.footera_online_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (char_length(username) between 2 and 20),
 club_name text not null check (char_length(club_name) between 2 and 30),
 rating smallint not null check (rating between 0 and 99),
 chem smallint not null check (chem between 0 and 33),
 formation text not null check (formation in ('4-3-3','4-4-2','4-2-3-1')),
 squad jsonb not null check (jsonb_typeof(squad) = 'array' and jsonb_array_length(squad) = 18 and pg_column_size(squad) < 32768),
 squads jsonb not null default '[]'::jsonb constraint footera_online_profiles_squads_check check (jsonb_typeof(squads) = 'array' and jsonb_array_length(squads) <= 3 and pg_column_size(squads) < 98304),
 active_preset smallint not null default 0 constraint footera_online_profiles_active_preset_check check (active_preset between 0 and 2),
 updated_at timestamptz not null default now()
);
alter table public.footera_online_profiles enable row level security;
drop policy if exists footera_profile_read_self on public.footera_online_profiles;
create policy footera_profile_read_self on public.footera_online_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists footera_profile_insert_self on public.footera_online_profiles;
create policy footera_profile_insert_self on public.footera_online_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists footera_profile_update_self on public.footera_online_profiles;
create policy footera_profile_update_self on public.footera_online_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.footera_online_profiles from anon, authenticated;
grant select, insert, update on public.footera_online_profiles to authenticated;

-- V20.32: share the current active squad plus up to three complete saved squads.
alter table public.footera_online_profiles add column if not exists squads jsonb not null default '[]'::jsonb;
alter table public.footera_online_profiles add column if not exists active_preset smallint not null default 0;
do $
begin
 if not exists (select 1 from pg_constraint where conname = 'footera_online_profiles_squads_check') then
  alter table public.footera_online_profiles add constraint footera_online_profiles_squads_check check (jsonb_typeof(squads) = 'array' and jsonb_array_length(squads) <= 3 and pg_column_size(squads) < 98304);
 end if;
 if not exists (select 1 from pg_constraint where conname = 'footera_online_profiles_active_preset_check') then
  alter table public.footera_online_profiles add constraint footera_online_profiles_active_preset_check check (active_preset between 0 and 2);
 end if;
end $;

create or replace function public.footera_friend_profile(p_friend uuid)
returns jsonb language plpgsql security definer set search_path = '' as $
declare p public.footera_online_profiles;
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 select * into p from public.footera_online_profiles where user_id = p_friend;
 if p.user_id is null then return null; end if;
 return jsonb_build_object(
  'user_id',p.user_id,'username',p.username,'club_name',p.club_name,'rating',p.rating,'chem',p.chem,
  'formation',p.formation,'squad',p.squad,'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,'updated_at',p.updated_at
 );
end $;
revoke all on function public.footera_friend_profile(uuid) from public, anon;
grant execute on function public.footera_friend_profile(uuid) to authenticated;

-- V20.34: short, server-backed friend codes.
alter table public.footera_online_profiles
 add column if not exists friend_code text;

create unique index if not exists footera_online_profiles_friend_code_uidx
 on public.footera_online_profiles(friend_code)
 where friend_code is not null;

create or replace function public.footera_assign_friend_code()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; candidate text; i integer;
begin
 if tg_op='UPDATE' and old.friend_code is not null and new.friend_code is distinct from old.friend_code then
  raise exception 'Freundescode kann nicht geändert werden';
 end if;
 if new.friend_code is null or new.friend_code='' then
  loop
   candidate := '';
   for i in 1..8 loop candidate := candidate || substr(alphabet,1+floor(random()*32)::integer,1); end loop;
   exit when not exists(select 1 from public.footera_online_profiles p where p.friend_code=candidate);
  end loop;
  new.friend_code := candidate;
 else
  new.friend_code := upper(regexp_replace(new.friend_code,'[^A-Z0-9]','','g'));
 end if;
 if new.friend_code !~ '^[A-HJ-NP-Z2-9]{8}$' then raise exception 'Ungültiger Freundescode'; end if;
 return new;
end $$;
revoke all on function public.footera_assign_friend_code() from public, anon, authenticated;

drop trigger if exists footera_assign_friend_code_trigger on public.footera_online_profiles;
create trigger footera_assign_friend_code_trigger
before insert or update of friend_code on public.footera_online_profiles
for each row execute function public.footera_assign_friend_code();

update public.footera_online_profiles
set friend_code = null
where friend_code is null;

alter table public.footera_online_profiles
 alter column friend_code set not null;

do $
begin
 if not exists (
  select 1 from pg_constraint
  where conname='footera_online_profiles_friend_code_check'
    and conrelid='public.footera_online_profiles'::regclass
 ) then
  alter table public.footera_online_profiles
   add constraint footera_online_profiles_friend_code_check
   check (friend_code ~ '^[A-HJ-NP-Z2-9]{8}

create or replace function public.footera_my_friend_code()
returns text language sql stable security invoker set search_path = '' as $$
 select p.friend_code from public.footera_online_profiles p where p.user_id=(select auth.uid())
$$;
revoke all on function public.footera_my_friend_code() from public, anon;
grant execute on function public.footera_my_friend_code() to authenticated;

create or replace function public.footera_friend_by_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare normalized text; p public.footera_online_profiles;
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 normalized := upper(regexp_replace(coalesce(p_code,''),'[^A-Z0-9]','','g'));
 if normalized !~ '^[A-HJ-NP-Z2-9]{8}$' then return null; end if;
 select * into p from public.footera_online_profiles where friend_code=normalized limit 1;
 if p.user_id is null then return null; end if;
 return jsonb_build_object(
  'user_id',p.user_id,'username',p.username,'club_name',p.club_name,'rating',p.rating,'chem',p.chem,
  'formation',p.formation,'squad',p.squad,'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,'updated_at',p.updated_at
 );
end $$;
revoke all on function public.footera_friend_by_code(text) from public, anon;
grant execute on function public.footera_friend_by_code(text) to authenticated;


create table if not exists public.footera_duels (
 id uuid primary key default gen_random_uuid(),
 home_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 away_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 home_profile jsonb not null,
 away_profile jsonb,
 home_lineup jsonb not null,
 away_lineup jsonb,
 status text not null default 'invited' check (status in ('invited','live','halftime','finished','declined','abandoned')),
 minute smallint not null default 0 check (minute between 0 and 90),
 home_score smallint not null default 0 check (home_score between 0 and 99),
 away_score smallint not null default 0 check (away_score between 0 and 99),
 home_tactic text not null default 'balanced' check (home_tactic in ('balanced','attacking','defensive')),
 away_tactic text not null default 'balanced' check (away_tactic in ('balanced','attacking','defensive')),
 home_subs smallint not null default 0 check (home_subs between 0 and 5),
 away_subs smallint not null default 0 check (away_subs between 0 and 5),
 home_used_bench jsonb not null default '[]'::jsonb,
 away_used_bench jsonb not null default '[]'::jsonb,
 home_ready boolean not null default false,
 away_ready boolean not null default false,
 events jsonb not null default '[]'::jsonb,
 clock_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 check (home_user <> away_user)
);
create index if not exists footera_duels_home_created on public.footera_duels(home_user,created_at desc);
create index if not exists footera_duels_away_created on public.footera_duels(away_user,created_at desc);
alter table public.footera_duels enable row level security;
drop policy if exists footera_duels_participants on public.footera_duels;
create policy footera_duels_participants on public.footera_duels for select to authenticated using ((select auth.uid()) in (home_user,away_user));
revoke all on public.footera_duels from anon, authenticated;
grant select on public.footera_duels to authenticated;

create or replace function public.footera_invite(p_away uuid)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare h public.footera_online_profiles; a public.footera_online_profiles; d public.footera_duels;
begin
 if auth.uid() is null or p_away = auth.uid() then raise exception 'Ungültiger Gegner'; end if;
 select * into h from public.footera_online_profiles where user_id = auth.uid();
 select * into a from public.footera_online_profiles where user_id = p_away;
 if h.user_id is null or a.user_id is null then raise exception 'Beide Spieler müssen online registriert sein'; end if;
 if (select count(*) from public.footera_duels where home_user = auth.uid() and status = 'invited' and created_at > now() - interval '1 day') >= 5 then
  raise exception 'Zu viele offene Einladungen';
 end if;
 insert into public.footera_duels(home_user,away_user,home_profile,away_profile,home_lineup)
 values (h.user_id,a.user_id,to_jsonb(h),to_jsonb(a),h.squad) returning * into d;
 return d;
end $$;

create or replace function public.footera_respond(p_id uuid,p_accept boolean)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; a public.footera_online_profiles;
begin
 select * into d from public.footera_duels where id = p_id for update;
 if d.id is null or d.status <> 'invited' or (auth.uid() <> d.away_user and not (auth.uid() = d.home_user and p_accept = false)) then
  raise exception 'Einladung nicht verfügbar';
 end if;
 if p_accept then
  select * into a from public.footera_online_profiles where user_id = auth.uid();
  if a.user_id is null then raise exception 'Online-Profil fehlt'; end if;
  update public.footera_duels set away_profile=to_jsonb(a),away_lineup=a.squad,status='live',clock_at=now(),
   events=jsonb_build_array(jsonb_build_object('minute',0,'kind','kickoff','text','Anpfiff')) where id=p_id returning * into d;
 else
  update public.footera_duels set status='declined',finished_at=now() where id=p_id returning * into d;
 end if;
 return d;
end $$;

create or replace function public.footera_command(p_id uuid,p_command text,p_value text default null,p_out integer default null,p_in integer default null)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; home_side boolean; lineup jsonb; used jsonb; starter jsonb; bench jsonb; side text;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) or d.status not in ('live','halftime') then
  raise exception 'Live-Duell nicht verfügbar';
 end if;
 home_side := auth.uid() = d.home_user; side := case when home_side then 'home' else 'away' end;
 if p_command = 'abandon' then
  update public.footera_duels set status='abandoned',finished_at=now(),
   events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','break','text','Duell abgebrochen')) where id=p_id returning * into d;
  return d;
 elsif p_command = 'tactic' then
  if p_value not in ('balanced','attacking','defensive') then raise exception 'Ungültige Taktik'; end if;
  if home_side then update public.footera_duels set home_tactic=p_value where id=p_id returning * into d;
  else update public.footera_duels set away_tactic=p_value where id=p_id returning * into d; end if;
 elsif p_command = 'sub' then
  if p_out is null or p_in is null or p_out not between 0 and 10 or p_in not between 11 and 17 then raise exception 'Ungültiger Wechsel'; end if;
  if (case when home_side then d.home_subs else d.away_subs end) >= 5 then raise exception 'Fünf Wechsel bereits genutzt'; end if;
  lineup := case when home_side then d.home_lineup else d.away_lineup end;
  used := case when home_side then d.home_used_bench else d.away_used_bench end;
  if used @> jsonb_build_array(p_in) then raise exception 'Bankspieler bereits eingesetzt'; end if;
  starter := lineup -> p_out; bench := lineup -> p_in;
  if starter is null or starter = 'null'::jsonb or bench is null or bench = 'null'::jsonb then raise exception 'Spieler fehlt'; end if;
  lineup := jsonb_set(jsonb_set(lineup,array[p_out::text],bench),array[p_in::text],starter);
  if home_side then
   update public.footera_duels set home_lineup=lineup,home_subs=home_subs+1,home_used_bench=used||jsonb_build_array(p_in),
    events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','sub','side',side,'text',coalesce(bench->>'name','Spieler')||' für '||coalesce(starter->>'name','Spieler'))) where id=p_id returning * into d;
  else
   update public.footera_duels set away_lineup=lineup,away_subs=away_subs+1,away_used_bench=used||jsonb_build_array(p_in),
    events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','sub','side',side,'text',coalesce(bench->>'name','Spieler')||' für '||coalesce(starter->>'name','Spieler'))) where id=p_id returning * into d;
  end if;
 elsif p_command = 'ready' then
  if d.status <> 'halftime' then raise exception 'Nicht in der Halbzeit'; end if;
  if home_side then d.home_ready := true; else d.away_ready := true; end if;
  update public.footera_duels set home_ready=d.home_ready,away_ready=d.away_ready,
   status=case when d.home_ready and d.away_ready then 'live' else 'halftime' end,
   clock_at=now(),events=case when d.home_ready and d.away_ready then events||jsonb_build_array(jsonb_build_object('minute',45,'kind','kickoff','text','2. Halbzeit')) else events end
   where id=p_id returning * into d;
 else raise exception 'Unbekannte Aktion';
 end if;
 return d;
end $$;

create or replace function public.footera_tick(p_id uuid)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; h numeric; a numeric; ph numeric; pa numeric; roll numeric; side text; scorer jsonb; idx integer; ev jsonb := '[]'::jsonb; next_minute integer;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) then raise exception 'Duell nicht verfügbar'; end if;
 if d.status <> 'live' or d.clock_at > now() - interval '850 milliseconds' then return d; end if;
 next_minute := d.minute + 1;
 h := greatest(45,least(99,(d.home_profile->>'rating')::numeric + (d.home_profile->>'chem')::numeric*.12));
 a := greatest(45,least(99,(d.away_profile->>'rating')::numeric + (d.away_profile->>'chem')::numeric*.12));
 ph := .014 * greatest(.65,least(1.4,h/a)) * (case d.home_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)
       * (case d.away_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 pa := .014 * greatest(.65,least(1.4,a/h)) * (case d.away_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)
       * (case d.home_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 roll := random();
 if roll < ph or roll < ph + pa then
  side := case when roll < ph then 'home' else 'away' end;
  idx := case when random()<.7 then 8+floor(random()*3)::integer else 5+floor(random()*3)::integer end;
  scorer := (case when side='home' then d.home_lineup else d.away_lineup end) -> idx;
  ev := jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','goal','side',side,'text',coalesce(scorer->>'name','Spieler'),'player',scorer));
  if side='home' then d.home_score := d.home_score+1; else d.away_score := d.away_score+1; end if;
 end if;
 if next_minute = 45 then
  ev := ev||jsonb_build_array(jsonb_build_object('minute',45,'kind','break','text','Halbzeit'));
 elsif next_minute = 90 then
  ev := ev||jsonb_build_array(jsonb_build_object('minute',90,'kind','break','text','Abpfiff'));
 end if;
 update public.footera_duels set minute=next_minute,home_score=d.home_score,away_score=d.away_score,
  events=events||ev,clock_at=now(),status=case when next_minute=45 then 'halftime' when next_minute=90 then 'finished' else 'live' end,
  finished_at=case when next_minute=90 then now() else null end where id=p_id returning * into d;
 return d;
end $$;

revoke all on function public.footera_invite(uuid),public.footera_respond(uuid,boolean),public.footera_command(uuid,text,text,integer,integer),public.footera_tick(uuid) from public, anon;
grant execute on function public.footera_invite(uuid),public.footera_respond(uuid,boolean),public.footera_command(uuid,text,text,integer,integer),public.footera_tick(uuid) to authenticated;

do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='footera_duels') then
  alter publication supabase_realtime add table public.footera_duels;
 end if;
end $$;
);
 end if;
end $;

create or replace function public.footera_my_friend_code()
returns text language sql stable security invoker set search_path = '' as $$
 select p.friend_code from public.footera_online_profiles p where p.user_id=(select auth.uid())
$$;
revoke all on function public.footera_my_friend_code() from public, anon;
grant execute on function public.footera_my_friend_code() to authenticated;

create or replace function public.footera_friend_by_code(p_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare normalized text; p public.footera_online_profiles;
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 normalized := upper(regexp_replace(coalesce(p_code,''),'[^A-Z0-9]','','g'));
 if normalized !~ '^[A-HJ-NP-Z2-9]{8}$' then return null; end if;
 select * into p from public.footera_online_profiles where friend_code=normalized limit 1;
 if p.user_id is null then return null; end if;
 return jsonb_build_object(
  'user_id',p.user_id,'username',p.username,'club_name',p.club_name,'rating',p.rating,'chem',p.chem,
  'formation',p.formation,'squad',p.squad,'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,'updated_at',p.updated_at
 );
end $$;
revoke all on function public.footera_friend_by_code(text) from public, anon;
grant execute on function public.footera_friend_by_code(text) to authenticated;


create table if not exists public.footera_duels (
 id uuid primary key default gen_random_uuid(),
 home_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 away_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 home_profile jsonb not null,
 away_profile jsonb,
 home_lineup jsonb not null,
 away_lineup jsonb,
 status text not null default 'invited' check (status in ('invited','live','halftime','finished','declined','abandoned')),
 minute smallint not null default 0 check (minute between 0 and 90),
 home_score smallint not null default 0 check (home_score between 0 and 99),
 away_score smallint not null default 0 check (away_score between 0 and 99),
 home_tactic text not null default 'balanced' check (home_tactic in ('balanced','attacking','defensive')),
 away_tactic text not null default 'balanced' check (away_tactic in ('balanced','attacking','defensive')),
 home_subs smallint not null default 0 check (home_subs between 0 and 5),
 away_subs smallint not null default 0 check (away_subs between 0 and 5),
 home_used_bench jsonb not null default '[]'::jsonb,
 away_used_bench jsonb not null default '[]'::jsonb,
 home_ready boolean not null default false,
 away_ready boolean not null default false,
 events jsonb not null default '[]'::jsonb,
 clock_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 check (home_user <> away_user)
);
create index if not exists footera_duels_home_created on public.footera_duels(home_user,created_at desc);
create index if not exists footera_duels_away_created on public.footera_duels(away_user,created_at desc);
alter table public.footera_duels enable row level security;
drop policy if exists footera_duels_participants on public.footera_duels;
create policy footera_duels_participants on public.footera_duels for select to authenticated using ((select auth.uid()) in (home_user,away_user));
revoke all on public.footera_duels from anon, authenticated;
grant select on public.footera_duels to authenticated;

create or replace function public.footera_invite(p_away uuid)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare h public.footera_online_profiles; a public.footera_online_profiles; d public.footera_duels;
begin
 if auth.uid() is null or p_away = auth.uid() then raise exception 'Ungültiger Gegner'; end if;
 select * into h from public.footera_online_profiles where user_id = auth.uid();
 select * into a from public.footera_online_profiles where user_id = p_away;
 if h.user_id is null or a.user_id is null then raise exception 'Beide Spieler müssen online registriert sein'; end if;
 if (select count(*) from public.footera_duels where home_user = auth.uid() and status = 'invited' and created_at > now() - interval '1 day') >= 5 then
  raise exception 'Zu viele offene Einladungen';
 end if;
 insert into public.footera_duels(home_user,away_user,home_profile,away_profile,home_lineup)
 values (h.user_id,a.user_id,to_jsonb(h),to_jsonb(a),h.squad) returning * into d;
 return d;
end $$;

create or replace function public.footera_respond(p_id uuid,p_accept boolean)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; a public.footera_online_profiles;
begin
 select * into d from public.footera_duels where id = p_id for update;
 if d.id is null or d.status <> 'invited' or (auth.uid() <> d.away_user and not (auth.uid() = d.home_user and p_accept = false)) then
  raise exception 'Einladung nicht verfügbar';
 end if;
 if p_accept then
  select * into a from public.footera_online_profiles where user_id = auth.uid();
  if a.user_id is null then raise exception 'Online-Profil fehlt'; end if;
  update public.footera_duels set away_profile=to_jsonb(a),away_lineup=a.squad,status='live',clock_at=now(),
   events=jsonb_build_array(jsonb_build_object('minute',0,'kind','kickoff','text','Anpfiff')) where id=p_id returning * into d;
 else
  update public.footera_duels set status='declined',finished_at=now() where id=p_id returning * into d;
 end if;
 return d;
end $$;

create or replace function public.footera_command(p_id uuid,p_command text,p_value text default null,p_out integer default null,p_in integer default null)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; home_side boolean; lineup jsonb; used jsonb; starter jsonb; bench jsonb; side text;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) or d.status not in ('live','halftime') then
  raise exception 'Live-Duell nicht verfügbar';
 end if;
 home_side := auth.uid() = d.home_user; side := case when home_side then 'home' else 'away' end;
 if p_command = 'abandon' then
  update public.footera_duels set status='abandoned',finished_at=now(),
   events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','break','text','Duell abgebrochen')) where id=p_id returning * into d;
  return d;
 elsif p_command = 'tactic' then
  if p_value not in ('balanced','attacking','defensive') then raise exception 'Ungültige Taktik'; end if;
  if home_side then update public.footera_duels set home_tactic=p_value where id=p_id returning * into d;
  else update public.footera_duels set away_tactic=p_value where id=p_id returning * into d; end if;
 elsif p_command = 'sub' then
  if p_out is null or p_in is null or p_out not between 0 and 10 or p_in not between 11 and 17 then raise exception 'Ungültiger Wechsel'; end if;
  if (case when home_side then d.home_subs else d.away_subs end) >= 5 then raise exception 'Fünf Wechsel bereits genutzt'; end if;
  lineup := case when home_side then d.home_lineup else d.away_lineup end;
  used := case when home_side then d.home_used_bench else d.away_used_bench end;
  if used @> jsonb_build_array(p_in) then raise exception 'Bankspieler bereits eingesetzt'; end if;
  starter := lineup -> p_out; bench := lineup -> p_in;
  if starter is null or starter = 'null'::jsonb or bench is null or bench = 'null'::jsonb then raise exception 'Spieler fehlt'; end if;
  lineup := jsonb_set(jsonb_set(lineup,array[p_out::text],bench),array[p_in::text],starter);
  if home_side then
   update public.footera_duels set home_lineup=lineup,home_subs=home_subs+1,home_used_bench=used||jsonb_build_array(p_in),
    events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','sub','side',side,'text',coalesce(bench->>'name','Spieler')||' für '||coalesce(starter->>'name','Spieler'))) where id=p_id returning * into d;
  else
   update public.footera_duels set away_lineup=lineup,away_subs=away_subs+1,away_used_bench=used||jsonb_build_array(p_in),
    events=events||jsonb_build_array(jsonb_build_object('minute',minute,'kind','sub','side',side,'text',coalesce(bench->>'name','Spieler')||' für '||coalesce(starter->>'name','Spieler'))) where id=p_id returning * into d;
  end if;
 elsif p_command = 'ready' then
  if d.status <> 'halftime' then raise exception 'Nicht in der Halbzeit'; end if;
  if home_side then d.home_ready := true; else d.away_ready := true; end if;
  update public.footera_duels set home_ready=d.home_ready,away_ready=d.away_ready,
   status=case when d.home_ready and d.away_ready then 'live' else 'halftime' end,
   clock_at=now(),events=case when d.home_ready and d.away_ready then events||jsonb_build_array(jsonb_build_object('minute',45,'kind','kickoff','text','2. Halbzeit')) else events end
   where id=p_id returning * into d;
 else raise exception 'Unbekannte Aktion';
 end if;
 return d;
end $$;

create or replace function public.footera_tick(p_id uuid)
returns public.footera_duels language plpgsql security definer set search_path = '' as $$
declare d public.footera_duels; h numeric; a numeric; ph numeric; pa numeric; roll numeric; side text; scorer jsonb; idx integer; ev jsonb := '[]'::jsonb; next_minute integer;
begin
 select * into d from public.footera_duels where id=p_id for update;
 if d.id is null or auth.uid() is null or auth.uid() not in (d.home_user,d.away_user) then raise exception 'Duell nicht verfügbar'; end if;
 if d.status <> 'live' or d.clock_at > now() - interval '850 milliseconds' then return d; end if;
 next_minute := d.minute + 1;
 h := greatest(45,least(99,(d.home_profile->>'rating')::numeric + (d.home_profile->>'chem')::numeric*.12));
 a := greatest(45,least(99,(d.away_profile->>'rating')::numeric + (d.away_profile->>'chem')::numeric*.12));
 ph := .014 * greatest(.65,least(1.4,h/a)) * (case d.home_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)
       * (case d.away_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 pa := .014 * greatest(.65,least(1.4,a/h)) * (case d.away_tactic when 'attacking' then 1.15 when 'defensive' then .86 else 1 end)
       * (case d.home_tactic when 'defensive' then .86 when 'attacking' then 1.12 else 1 end);
 roll := random();
 if roll < ph or roll < ph + pa then
  side := case when roll < ph then 'home' else 'away' end;
  idx := case when random()<.7 then 8+floor(random()*3)::integer else 5+floor(random()*3)::integer end;
  scorer := (case when side='home' then d.home_lineup else d.away_lineup end) -> idx;
  ev := jsonb_build_array(jsonb_build_object('minute',next_minute,'kind','goal','side',side,'text',coalesce(scorer->>'name','Spieler'),'player',scorer));
  if side='home' then d.home_score := d.home_score+1; else d.away_score := d.away_score+1; end if;
 end if;
 if next_minute = 45 then
  ev := ev||jsonb_build_array(jsonb_build_object('minute',45,'kind','break','text','Halbzeit'));
 elsif next_minute = 90 then
  ev := ev||jsonb_build_array(jsonb_build_object('minute',90,'kind','break','text','Abpfiff'));
 end if;
 update public.footera_duels set minute=next_minute,home_score=d.home_score,away_score=d.away_score,
  events=events||ev,clock_at=now(),status=case when next_minute=45 then 'halftime' when next_minute=90 then 'finished' else 'live' end,
  finished_at=case when next_minute=90 then now() else null end where id=p_id returning * into d;
 return d;
end $$;

revoke all on function public.footera_invite(uuid),public.footera_respond(uuid,boolean),public.footera_command(uuid,text,text,integer,integer),public.footera_tick(uuid) from public, anon;
grant execute on function public.footera_invite(uuid),public.footera_respond(uuid,boolean),public.footera_command(uuid,text,text,integer,integer),public.footera_tick(uuid) to authenticated;

do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='footera_duels') then
  alter publication supabase_realtime add table public.footera_duels;
 end if;
end $$;


-- V20.41: friend chat and realtime message notifications.
create table if not exists public.footera_messages (
 id uuid primary key default gen_random_uuid(),
 sender_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 recipient_user uuid not null references public.footera_online_profiles(user_id) on delete cascade,
 body text not null check (char_length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 check (sender_user <> recipient_user)
);
create index if not exists footera_messages_sender_created on public.footera_messages(sender_user,created_at desc);
create index if not exists footera_messages_recipient_created on public.footera_messages(recipient_user,created_at desc);
alter table public.footera_messages enable row level security;
drop policy if exists footera_messages_participants_read on public.footera_messages;
create policy footera_messages_participants_read on public.footera_messages for select to authenticated using ((select auth.uid()) in (sender_user,recipient_user));
drop policy if exists footera_messages_sender_insert on public.footera_messages;
create policy footera_messages_sender_insert on public.footera_messages for insert to authenticated with check ((select auth.uid())=sender_user and recipient_user<>(select auth.uid()) and exists(select 1 from public.footera_online_profiles p where p.user_id=recipient_user));
drop policy if exists footera_messages_recipient_read_update on public.footera_messages;
create policy footera_messages_recipient_read_update on public.footera_messages for update to authenticated using ((select auth.uid())=recipient_user) with check ((select auth.uid())=recipient_user);
revoke all on public.footera_messages from anon, authenticated;
grant select, insert on public.footera_messages to authenticated;
grant update(read_at) on public.footera_messages to authenticated;
do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='footera_messages') then
  alter publication supabase_realtime add table public.footera_messages;
 end if;
end
$$;
