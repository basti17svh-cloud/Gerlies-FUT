-- V21.343: Champions Player Picks take 84+ cards instead of 85+ (Basti 2026-11-04,
-- "84 Plus ... nicht immer den besten quasi garantieren").
-- Rewrites only the Champions rating in the live footera_private.list_picks, keeping the rest identical.
do $$
declare def text;
begin
 select pg_get_functiondef('footera_private.list_picks(text)'::regprocedure) into def;
 if position('rating:=85; typ:=''champions-red''' in def)>0 then
  execute replace(def,'rating:=85; typ:=''champions-red''','rating:=84; typ:=''champions-red''');
 elsif position('rating:=84; typ:=''champions-red''' in def)=0 then
  raise exception 'list_picks has no Champions rating line';
 end if;
end $$;
-- Champions picks nobody has opened yet follow the new rule too.
update public.footera_player_picks set min_rating=84
 where type='champions-red' and min_rating=85 and options is null and claimed_at is null;
