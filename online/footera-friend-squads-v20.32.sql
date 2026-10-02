-- Footera V20.32 – aktuelle Freundes-Mannschaften
-- Einmal im Supabase SQL Editor des bestehenden Footera-Projekts ausführen.

alter table public.footera_online_profiles add column if not exists squads jsonb not null default '[]'::jsonb;
alter table public.footera_online_profiles add column if not exists active_preset smallint not null default 0;

do $$
begin
 if not exists (select 1 from pg_constraint where conname = 'footera_online_profiles_squads_check') then
  alter table public.footera_online_profiles add constraint footera_online_profiles_squads_check
   check (jsonb_typeof(squads) = 'array' and jsonb_array_length(squads) <= 3 and pg_column_size(squads) < 98304);
 end if;
 if not exists (select 1 from pg_constraint where conname = 'footera_online_profiles_active_preset_check') then
  alter table public.footera_online_profiles add constraint footera_online_profiles_active_preset_check
   check (active_preset between 0 and 2);
 end if;
end $$;

create or replace function public.footera_friend_profile(p_friend uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.footera_online_profiles;
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 select * into p from public.footera_online_profiles where user_id = p_friend;
 if p.user_id is null then return null; end if;
 return jsonb_build_object(
  'user_id',p.user_id,
  'username',p.username,
  'club_name',p.club_name,
  'rating',p.rating,
  'chem',p.chem,
  'formation',p.formation,
  'squad',p.squad,
  'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,
  'updated_at',p.updated_at
 );
end $$;

revoke all on function public.footera_friend_profile(uuid) from public, anon;
grant execute on function public.footera_friend_profile(uuid) to authenticated;
