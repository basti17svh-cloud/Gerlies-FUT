-- Online profiles must support every formation in SQUAD_FORMATION_NAMES (index.html).
-- Live migration applied on 2026-10-12 to unblock new accounts using 4-3-3 (4).
-- Does not update existing club, save, wallet or friend-code records.
alter table public.footera_online_profiles
  drop constraint if exists footera_online_profiles_formation_check;
alter table public.footera_online_profiles
  add constraint footera_online_profiles_formation_check
  check (formation = any (array['4-3-3'::text, '4-3-3 (2)'::text, '4-3-3 (3)'::text, '4-3-3 (4)'::text, '4-4-2'::text, '4-4-1-1'::text, '4-2-3-1'::text, '4-1-2-1-2 (2)'::text, '4-2-2-2'::text, '4-2-4'::text, '3-5-2'::text]));
