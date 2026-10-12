-- Footera V21.134: retention 90 days and delete user-linked statistics when account deleted.
alter table public.footera_analytics_activity_days add constraint footera_analytics_activity_user_fk
 foreign key(user_id) references auth.users(id) on delete cascade;
alter table public.footera_analytics_club_creations add constraint footera_analytics_club_user_fk
 foreign key(user_id) references auth.users(id) on delete cascade;
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
 delete from public.footera_analytics_visits where visited_on < v_day - 89;
 delete from public.footera_analytics_activity_days where active_on < v_day - 89;
end;
$$;


