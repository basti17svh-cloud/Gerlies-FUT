-- Footera V21.408: automatic JavaScript error reports (proposal #11), only with statistics consent.
-- Stored per day and error: version, screen, device class, cleaned error text, file:line.
-- No IP, e-mail, player or club data. Browsers are counted via the same SHA-256 hash as visits,
-- kept 30 days, and removed when a visitor withdraws consent (footera_analytics_forget_visitor).
create table if not exists public.footera_error_reports (
  day date not null,
  sig text not null check (sig ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('error','promise','manual')),
  message text not null check (char_length(message) between 1 and 300),
  source text not null default '' check (char_length(source) <= 90),
  build text not null check (char_length(build) between 1 and 16),
  screen text not null default '' check (char_length(screen) <= 40),
  device text not null default '' check (char_length(device) <= 40),
  hits integer not null default 1 check (hits >= 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (day, sig)
);
create index if not exists footera_error_reports_sig on public.footera_error_reports(sig, day);
create table if not exists public.footera_error_browsers (
  day date not null,
  sig text not null,
  visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
  primary key (day, sig, visitor_hash)
);
create index if not exists footera_error_browsers_visitor on public.footera_error_browsers(visitor_hash);
alter table public.footera_error_reports enable row level security;
alter table public.footera_error_browsers enable row level security;
revoke all on public.footera_error_reports, public.footera_error_browsers from public, anon, authenticated;
grant all on public.footera_error_reports, public.footera_error_browsers to service_role;

-- One call per report batch from the footera-analytics Edge Function (service_role only).
create or replace function public.footera_error_log(p_visitor_hash text, p_errors jsonb)
returns integer
language plpgsql security definer set search_path=''
as $$
declare
  v_day date := (now() at time zone 'Europe/Berlin')::date;
  v_count integer := 0;
  e jsonb; v_sig text; v_kind text; v_msg text; v_src text; v_build text; v_screen text; v_device text;
begin
  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid visitor'; end if;
  if jsonb_typeof(p_errors) <> 'array' or jsonb_array_length(p_errors) > 8 then raise exception 'Invalid errors'; end if;
  -- Hard cap: one browser can add at most 40 error rows per day, so a broken loop cannot flood the table.
  if (select count(*) from public.footera_error_browsers b where b.day = v_day and b.visitor_hash = p_visitor_hash) >= 40 then
    return 0;
  end if;
  for e in select * from jsonb_array_elements(p_errors) loop
    v_kind := coalesce(e->>'kind','error');
    v_msg := left(btrim(coalesce(e->>'message','')), 300);
    v_src := left(coalesce(e->>'source',''), 90);
    v_build := left(coalesce(nullif(btrim(e->>'build'),''),'?'), 16);
    v_screen := left(coalesce(e->>'screen',''), 40);
    v_device := left(coalesce(e->>'device',''), 40);
    continue when v_kind not in ('error','promise','manual') or v_msg = '';
    -- Same error text at the same place in the same version = one row per day.
    v_sig := encode(extensions.digest(v_kind||'|'||v_msg||'|'||v_src||'|'||v_build, 'sha256'), 'hex');
    insert into public.footera_error_reports(day, sig, kind, message, source, build, screen, device)
    values (v_day, v_sig, v_kind, v_msg, v_src, v_build, v_screen, v_device)
    on conflict (day, sig) do update set hits = public.footera_error_reports.hits + 1,
      last_seen_at = now(), screen = excluded.screen, device = excluded.device;
    insert into public.footera_error_browsers(day, sig, visitor_hash) values (v_day, v_sig, p_visitor_hash)
    on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  delete from public.footera_error_reports where day < v_day - 30;
  delete from public.footera_error_browsers where day < v_day - 30;
  return v_count;
end;
$$;

-- Top errors of the last 7 days for the protected statistics dashboard.
create or replace function public.footera_error_summary(p_days integer default 7)
returns jsonb
language sql stable security definer set search_path=''
as $$
  with ref as (select (now() at time zone 'Europe/Berlin')::date as today),
  agg as (
    select r.sig, max(r.kind) kind, max(r.message) message, max(r.source) source, max(r.build) build,
      sum(r.hits)::int hits, min(r.first_seen_at) first_seen, max(r.last_seen_at) last_seen,
      (array_agg(r.screen order by r.last_seen_at desc))[1] screen,
      (array_agg(r.device order by r.last_seen_at desc))[1] device,
      (select count(distinct b.visitor_hash) from public.footera_error_browsers b
        where b.sig = r.sig and b.day >= (select today from ref) - (greatest(1,least(p_days,30)) - 1))::int browsers
    from public.footera_error_reports r
    where r.day >= (select today from ref) - (greatest(1,least(p_days,30)) - 1)
    group by r.sig
  )
  select jsonb_build_object(
    'days', greatest(1,least(p_days,30)),
    'total_hits', coalesce((select sum(hits) from agg),0),
    'distinct_errors', (select count(*) from agg),
    'top', coalesce((select jsonb_agg(to_jsonb(a) - 'sig' order by a.browsers desc, a.hits desc)
       from (select * from agg order by browsers desc, hits desc limit 15) a), '[]'::jsonb)
  );
$$;

-- Withdrawing statistics consent also removes the browser from error counts.
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
 delete from public.footera_error_browsers where visitor_hash=p_visitor_hash;
 if p_verified_user_id is not null then
  delete from public.footera_analytics_activity_days where user_id=p_verified_user_id;
 end if;
end;
$$;

revoke all on function public.footera_error_log(text, jsonb) from public, anon, authenticated;
revoke all on function public.footera_error_summary(integer) from public, anon, authenticated;
grant execute on function public.footera_error_log(text, jsonb) to service_role;
grant execute on function public.footera_error_summary(integer) to service_role;
