-- Footera V21.133: first-party opt-in visitor statistics and server-derived player KPIs.
-- No IP, user-agent, full URL, email or raw visitor UUID is stored in analytics tables.
-- Browser identifiers are random v4 UUIDs and SHA-256 hashed in the Edge Function.
create table if not exists public.footera_analytics_visits (
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  visited_on date not null,
  source text not null check (source in ('instagram','facebook','tiktok','google','direct','other')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  sightings smallint not null default 1 check (sightings between 1 and 120),
  primary key(visitor_hash, visited_on)
);
create index if not exists footera_analytics_visits_day on public.footera_analytics_visits(visited_on,source);
create table if not exists public.footera_analytics_activity_days (
  user_id uuid not null,
  active_on date not null,
  last_seen_at timestamptz not null default now(),
  primary key(user_id,active_on)
);
create index if not exists footera_analytics_activity_day on public.footera_analytics_activity_days(active_on);
create table if not exists public.footera_analytics_club_creations (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);
create index if not exists footera_analytics_club_created on public.footera_analytics_club_creations(created_at);
create table if not exists public.footera_analytics_admins(
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
-- All analytics tables are private. Even logged in players have no direct access.
alter table public.footera_analytics_visits enable row level security;
alter table public.footera_analytics_activity_days enable row level security;
alter table public.footera_analytics_club_creations enable row level security;
alter table public.footera_analytics_admins enable row level security;
revoke all on public.footera_analytics_visits,public.footera_analytics_activity_days,
  public.footera_analytics_club_creations,public.footera_analytics_admins from public,anon,authenticated;
grant all on public.footera_analytics_visits,public.footera_analytics_activity_days,
  public.footera_analytics_club_creations,public.footera_analytics_admins to service_role;

create or replace function public.footera_analytics_log_consent_visit(
 p_visitor_hash text, p_source text, p_verified_user_id uuid default null
) returns void
language plpgsql security definer set search_path=''
as $$
declare v_day date := (now() at time zone 'Europe/Berlin')::date;
begin
 if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$'
    or p_source is null or p_source not in ('instagram','facebook','tiktok','google','direct','other') then
   raise exception 'Invalid analytics event';
 end if;
 insert into public.footera_analytics_visits(visitor_hash,visited_on,source)
 values(p_visitor_hash,v_day,p_source)
 on conflict (visitor_hash,visited_on) do update set
  last_seen_at=now(),
  sightings=least(120,public.footera_analytics_visits.sightings+1);
 if p_verified_user_id is not null and exists(
  select 1 from auth.users u
  where u.id=p_verified_user_id and not u.is_anonymous and u.email_confirmed_at is not null
 ) then
   insert into public.footera_analytics_activity_days(user_id,active_on)
   values(p_verified_user_id,v_day)
   on conflict(user_id,active_on) do update set last_seen_at=now();
 end if;
end;
$$;

create or replace function public.footera_analytics_forget_visitor(
 p_visitor_hash text, p_verified_user_id uuid default null
) returns void
language plpgsql security definer set search_path=''
as $$
begin
 if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$' then
   raise exception 'Invalid analytics visitor';
 end if;
 delete from public.footera_analytics_visits where visitor_hash=p_visitor_hash;
 if p_verified_user_id is not null then
  delete from public.footera_analytics_activity_days where user_id=p_verified_user_id;
 end if;
end;
$$;

create or replace function public.footera_analytics_record_club_creation()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.footera_analytics_club_creations(user_id,created_at)
 values(new.user_id,now()) on conflict(user_id) do nothing;
 return new;
end;
$$;
drop trigger if exists footera_analytics_club_created on public.footera_online_profiles;
create trigger footera_analytics_club_created after insert on public.footera_online_profiles
 for each row execute function public.footera_analytics_record_club_creation();

-- One protected RPC generates an aggregate-only report; browsers cannot call it.
create or replace function public.footera_analytics_summary()
returns jsonb
language sql stable security definer set search_path=''
as $$
with ref as (
 select (now() at time zone 'Europe/Berlin')::date as today
), registrations as (
 select
 count(*) as accounts,
 count(*) filter(where not coalesce(u.is_anonymous,false)) as real_registrations,
 count(*) filter(where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is not null) as verified_registrations,
 count(*) filter(where u.is_anonymous) as guest_accounts,
 count(*) filter(where not coalesce(u.is_anonymous,false) and u.email_confirmed_at is null) as pending_emails,
 count(*) filter(where not coalesce(u.is_anonymous,false) and u.created_at >= (select today from ref)::timestamp at time zone 'Europe/Berlin') as new_today,
 count(*) filter(where not coalesce(u.is_anonymous,false) and u.created_at >= ((select today from ref)-6)::timestamp at time zone 'Europe/Berlin') as new_week
 from auth.users u
), visitors as (
 select
 count(distinct visitor_hash) filter(where visited_on=(select today from ref)) as today,
 count(distinct visitor_hash) filter(where visited_on>=(select today from ref)-6) as week,
 count(distinct visitor_hash) filter(where visited_on>=(select today from ref)-29) as month,
 count(distinct visitor_hash) as all_recorded
 from public.footera_analytics_visits
), player_activity as (
 select count(distinct user_id) filter(where active_on=(select today from ref)) as today,
 count(distinct user_id) filter(where active_on>=(select today from ref)-6) as week
 from public.footera_analytics_activity_days
), profile_activity as (
 select count(*) as total,
 count(*) filter(where last_seen_at >= now()-interval '24 hours') as seen_24h,
 count(*) filter(where last_seen_at >= now()-interval '7 days') as seen_7d
 from public.footera_online_profiles
), clubs as (
 select count(*) as created_since_tracking,
 count(*) filter(where created_at >= (select today from ref)::timestamp at time zone 'Europe/Berlin') as created_today,
 count(*) filter(where created_at >= ((select today from ref)-6)::timestamp at time zone 'Europe/Berlin') as created_week
 from public.footera_analytics_club_creations
), traffic_trend as (
 select coalesce(jsonb_agg(jsonb_build_object(
   'day', d.visit_date::text,
   'visitors',coalesce(v.visitors,0),
   'instagram',coalesce(v.instagram,0),
   'registrations',coalesce(a.registered,0),
   'club_creations',coalesce(c.created,0)
 ) order by d.visit_date),'[]'::jsonb) as trend
 from (select generate_series((select today from ref)-29,(select today from ref),interval '1 day')::date as visit_date) d
 left join lateral (
  select count(distinct visitor_hash) visitors,
    count(distinct visitor_hash) filter(where source='instagram') instagram
  from public.footera_analytics_visits t where t.visited_on=d.visit_date
 ) v on true
 left join lateral (
  select count(*) as registered from auth.users u
  where not coalesce(u.is_anonymous,false)
  and (u.created_at at time zone 'Europe/Berlin')::date=d.visit_date
 ) a on true
 left join lateral(
  select count(*) as created from public.footera_analytics_club_creations t
  where (t.created_at at time zone 'Europe/Berlin')::date=d.visit_date
 ) c on true
), sources as (
 select coalesce(jsonb_object_agg(source,visitors),'{}'::jsonb) as counts from (
  select source,count(distinct visitor_hash) visitors
  from public.footera_analytics_visits where visited_on>=(select today from ref)-29
  group by source
 ) a
)
select jsonb_build_object(
 'as_of',now(), 'timezone','Europe/Berlin',
 'accounts',(select row_to_json(registrations) from registrations),
 'visitor_counts',(select row_to_json(visitors) from visitors),
 'consented_active',(select row_to_json(player_activity) from player_activity),
 'profiles',(select row_to_json(profile_activity) from profile_activity),
 'club_creations',(select row_to_json(clubs) from clubs),
 'sources_30d',(select counts from sources),
 'daily_30d',(select trend from traffic_trend),
 'tracking_start',(select min(visited_on) from public.footera_analytics_visits)
);
$$;
revoke all on function public.footera_analytics_log_consent_visit(text,text,uuid) from public,anon,authenticated;
revoke all on function public.footera_analytics_forget_visitor(text,uuid) from public,anon,authenticated;
revoke all on function public.footera_analytics_record_club_creation() from public,anon,authenticated;
revoke all on function public.footera_analytics_summary() from public,anon,authenticated;
grant execute on function public.footera_analytics_log_consent_visit(text,text,uuid) to service_role;
grant execute on function public.footera_analytics_forget_visitor(text,uuid) to service_role;
grant execute on function public.footera_analytics_summary() to service_role;
