-- Footera V20.34 – kurze Freundescodes über Supabase
-- Für bestehende Projekte einmal ausführen. Neue Profile erhalten automatisch einen 8-stelligen Code.

alter table public.footera_online_profiles
  add column if not exists friend_code text;

create unique index if not exists footera_online_profiles_friend_code_uidx
  on public.footera_online_profiles(friend_code)
  where friend_code is not null;

create or replace function public.footera_assign_friend_code()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  if tg_op = 'UPDATE'
     and old.friend_code is not null
     and new.friend_code is distinct from old.friend_code then
    raise exception 'Freundescode kann nicht geändert werden';
  end if;

  if new.friend_code is null or new.friend_code = '' then
    loop
      candidate := '';
      for i in 1..8 loop
        candidate := candidate || substr(alphabet, 1 + floor(random() * 32)::integer, 1);
      end loop;
      exit when not exists (
        select 1
        from public.footera_online_profiles p
        where p.friend_code = candidate
      );
    end loop;
    new.friend_code := candidate;
  else
    new.friend_code := upper(regexp_replace(new.friend_code, '[^A-Z0-9]', '', 'g'));
  end if;

  if new.friend_code !~ '^[A-HJ-NP-Z2-9]{8}$' then
    raise exception 'Ungültiger Freundescode';
  end if;

  return new;
end
$$;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'footera_online_profiles_friend_code_check'
      and conrelid = 'public.footera_online_profiles'::regclass
  ) then
    alter table public.footera_online_profiles
      add constraint footera_online_profiles_friend_code_check
      check (friend_code ~ '^[A-HJ-NP-Z2-9]{8}$');
  end if;
end
$$;

create or replace function public.footera_my_friend_code()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select p.friend_code
  from public.footera_online_profiles p
  where p.user_id = (select auth.uid())
$$;

revoke all on function public.footera_my_friend_code() from public, anon;
grant execute on function public.footera_my_friend_code() to authenticated;

create or replace function public.footera_friend_by_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized text;
  p public.footera_online_profiles;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;

  normalized := upper(regexp_replace(coalesce(p_code,''), '[^A-Z0-9]', '', 'g'));
  if normalized !~ '^[A-HJ-NP-Z2-9]{8}$' then
    return null;
  end if;

  select *
  into p
  from public.footera_online_profiles
  where friend_code = normalized
  limit 1;

  if p.user_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', p.user_id,
    'username', p.username,
    'club_name', p.club_name,
    'rating', p.rating,
    'chem', p.chem,
    'formation', p.formation,
    'squad', p.squad,
    'squads', coalesce(p.squads, '[]'::jsonb),
    'active_preset', p.active_preset,
    'updated_at', p.updated_at
  );
end
$$;

revoke all on function public.footera_friend_by_code(text) from public, anon;
grant execute on function public.footera_friend_by_code(text) to authenticated;
