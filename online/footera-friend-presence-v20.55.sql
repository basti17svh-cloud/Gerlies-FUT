-- Footera V20.55: activity expires after 90 seconds without a visible-app heartbeat.
-- Profile RLS remains self-only. Status RPC requires an authenticated session and known IDs.
begin;
alter table public.footera_online_profiles add column if not exists last_seen_at timestamptz;

create or replace function public.footera_presence_heartbeat()
returns void language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 update public.footera_online_profiles set last_seen_at = now() where user_id = (select auth.uid());
end $$;
revoke all on function public.footera_presence_heartbeat() from public, anon;
grant execute on function public.footera_presence_heartbeat() to authenticated;

create or replace function public.footera_friend_statuses(p_friends uuid[])
returns table(user_id uuid, is_online boolean, expires_in double precision)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 if cardinality(p_friends) > 1000 then raise exception 'Zu viele Freunde'; end if;
 return query
 select ids.id,
  case when p.last_seen_at is null then null
       else p.last_seen_at > now() - interval '90 seconds' and p.last_seen_at <= now() + interval '5 seconds' end,
  greatest(0::double precision, least(90::double precision, extract(epoch from p.last_seen_at + interval '90 seconds' - now())::double precision))
 from (select distinct unnest(p_friends) as id) ids
 left join public.footera_online_profiles p on p.user_id = ids.id;
end $$;
revoke all on function public.footera_friend_statuses(uuid[]) from public, anon;
grant execute on function public.footera_friend_statuses(uuid[]) to authenticated;
notify pgrst, 'reload schema';
commit;
