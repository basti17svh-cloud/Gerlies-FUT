-- V21.241: Icons in the standard pick catalogue were seeded with an empty variant,
-- so Player Picks offered and delivered them as gold rare cards. Give them the
-- Icon identity packs use (variant icon-mid, eventName Icon). Idempotent; only
-- adds those two keys, never removes a card or touches a claimed pick.
update public.footera_pick_catalog
set item=item||jsonb_build_object('variant','icon-mid','eventName','Icon')
where kind='standard' and (item->'baseSnapshot'->>'isIcon')::boolean
  and coalesce(item->>'variant','')='';

-- Offers that were already opened but not yet claimed keep their players; only
-- their Icon options get the Icon variant.
update public.footera_player_picks p
set options=(
  select jsonb_agg(case when (o->'item'->'baseSnapshot'->>'isIcon')::boolean
                         and coalesce(o->'item'->>'variant','')=''
    then jsonb_set(o,'{item}',(o->'item')||jsonb_build_object('variant','icon-mid','eventName','Icon'))
    else o end order by ord)
  from jsonb_array_elements(p.options) with ordinality as x(o,ord))
where p.claimed_at is null and p.options is not null
  and exists(select 1 from jsonb_array_elements(p.options) o
    where (o->'item'->'baseSnapshot'->>'isIcon')::boolean and coalesce(o->'item'->>'variant','')='');
