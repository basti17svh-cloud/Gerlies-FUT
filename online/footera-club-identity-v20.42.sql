-- Footera V20.42 – Vereinsidentität
-- Bereits im verbundenen Footera-Supabase-Projekt angewendet.

alter table public.footera_online_profiles
 add column if not exists club_short_name text not null default 'FTR',
 add column if not exists club_identity jsonb not null default '{"crest":{"shape":"shield","symbol":"star","primary":"#d8ff3e","secondary":"#173627","accent":"#ffffff","initials":"F"},"colors":{"primary":"#d8ff3e","secondary":"#173627","accent":"#ffffff"},"kits":{"home":{"pattern":"solid","shirtPrimary":"#d8ff3e","shirtSecondary":"#173627","shorts":"#111714","socks":"#d8ff3e"},"away":{"pattern":"diagonal","shirtPrimary":"#f1f4f2","shirtSecondary":"#173627","shorts":"#f1f4f2","socks":"#173627"}}}'::jsonb;

do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conname='footera_online_profiles_short_name_check'
    and conrelid='public.footera_online_profiles'::regclass
 ) then
  alter table public.footera_online_profiles
   add constraint footera_online_profiles_short_name_check
   check (char_length(club_short_name) between 2 and 4);
 end if;
 if not exists (
  select 1 from pg_constraint
  where conname='footera_online_profiles_identity_check'
    and conrelid='public.footera_online_profiles'::regclass
 ) then
  alter table public.footera_online_profiles
   add constraint footera_online_profiles_identity_check
   check (jsonb_typeof(club_identity)='object' and pg_column_size(club_identity)<16384);
 end if;
end
$$;

create or replace function public.footera_friend_profile(p_friend uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.footera_online_profiles;
begin
 if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
 select * into p from public.footera_online_profiles where user_id = p_friend;
 if p.user_id is null then return null; end if;
 return jsonb_build_object(
  'user_id',p.user_id,'username',p.username,'club_name',p.club_name,'club_short_name',p.club_short_name,
  'club_identity',p.club_identity,'rating',p.rating,'chem',p.chem,'formation',p.formation,
  'squad',p.squad,'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,'updated_at',p.updated_at
 );
end $$;
revoke all on function public.footera_friend_profile(uuid) from public, anon;
grant execute on function public.footera_friend_profile(uuid) to authenticated;

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
  'user_id',p.user_id,'username',p.username,'club_name',p.club_name,'club_short_name',p.club_short_name,
  'club_identity',p.club_identity,'rating',p.rating,'chem',p.chem,'formation',p.formation,
  'squad',p.squad,'squads',coalesce(p.squads,'[]'::jsonb),
  'active_preset',p.active_preset,'updated_at',p.updated_at
 );
end $$;
revoke all on function public.footera_friend_by_code(text) from public, anon;
grant execute on function public.footera_friend_by_code(text) to authenticated;
