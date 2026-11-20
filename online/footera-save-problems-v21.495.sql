-- Footera V21.495: Speicherprobleme auf Geräten sichtbar machen (Basti 2026-11-20, nach Max' vollem iPhone).
-- Ein angemeldetes Gerät meldet, wenn es den Spielstand nicht speichern kann, wenn es ihn komprimieren
-- musste, wenn die Cloud-Sicherung wegen einer fehlenden bestätigten Belohnung gesperrt ist oder wenn ein
-- Verein aus der IndexedDB-Kopie wiederhergestellt wurde. Gespeichert: Art, Version, Größe in Zeichen,
-- Gerätetyp. Keine Inhalte des Spielstands. Höchstens 30 Meldungen pro Konto und Tag, 60 Tage aufbewahrt.
create table if not exists public.footera_save_problems (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('save-failed','save-compressed','backup-blocked','mirror-failed','restored-from-mirror','save-size')),
  reason text not null default '' check (char_length(reason) <= 60),
  chars integer check (chars is null or chars between 0 and 100000000),
  build text not null default '' check (char_length(build) <= 16),
  device text not null default '' check (char_length(device) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists footera_save_problems_user on public.footera_save_problems(user_id, created_at desc);
create index if not exists footera_save_problems_time on public.footera_save_problems(created_at desc);
alter table public.footera_save_problems enable row level security;
revoke all on public.footera_save_problems from public, anon, authenticated;
grant all on public.footera_save_problems to service_role;

create or replace function public.footera_report_save_problem(p_kind text, p_reason text, p_chars integer, p_build text, p_device text)
returns boolean
language plpgsql security definer set search_path=''
as $$
declare u uuid := auth.uid();
begin
  if u is null then return false; end if;
  if p_kind is null or p_kind not in ('save-failed','save-compressed','backup-blocked','mirror-failed','restored-from-mirror','save-size') then
    raise exception 'Ungültige Meldung.' using errcode = '22023';
  end if;
  if (select count(*) from public.footera_save_problems p where p.user_id = u and p.created_at > now() - interval '1 day') >= 30 then
    return false;
  end if;
  insert into public.footera_save_problems(user_id, kind, reason, chars, build, device)
  values (u, p_kind, left(coalesce(p_reason,''), 60),
          case when p_chars between 0 and 100000000 then p_chars end,
          left(coalesce(p_build,''), 16), left(coalesce(p_device,''), 40));
  delete from public.footera_save_problems where created_at < now() - interval '60 days';
  return true;
end;
$$;
revoke all on function public.footera_report_save_problem(text, text, integer, text, text) from public, anon;
grant execute on function public.footera_report_save_problem(text, text, integer, text, text) to authenticated;

-- Für das geschützte Statistik-Dashboard (nur service_role über footera-analytics-admin):
-- je Konto die letzte Meldung der letzten p_days Tage, mit Vereinsname, Kartenzahl und Cloud-Stand.
create or replace function public.footera_save_problem_summary(p_days integer default 7)
returns jsonb
language sql stable security definer set search_path=''
as $$
  with recent as (
    select p.* from public.footera_save_problems p
    where p.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days,7), 60)))
      and p.kind <> 'save-size'
  ), per_user as (
    select distinct on (r.user_id) r.user_id, r.kind, r.reason, r.chars, r.build, r.device, r.created_at,
      (select count(*) from recent x where x.user_id = r.user_id)::int as reports
    from recent r order by r.user_id, r.created_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'club', coalesce(c.save_data#>>'{profile,clubName}', '?'),
    'save_id', coalesce(c.save_data#>>'{profile,saveId}', ''),
    'cards', coalesce(jsonb_array_length(c.save_data->'club'), 0),
    'cloud_saved_at', c.saved_at,
    'kind', u.kind, 'reason', u.reason, 'chars', u.chars, 'build', u.build, 'device', u.device,
    'last_at', u.created_at, 'reports', u.reports
  ) order by u.created_at desc), '[]'::jsonb)
  from per_user u left join public.footera_cloud_saves c on c.user_id = u.user_id;
$$;
revoke all on function public.footera_save_problem_summary(integer) from public, anon, authenticated;
grant execute on function public.footera_save_problem_summary(integer) to service_role;
